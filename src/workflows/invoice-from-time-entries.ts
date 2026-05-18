import { prisma } from "@/core/db";
import { linkService } from "@/core/links";
import { runWorkflow, type WorkflowStep } from "@/core/workflow";
import { invoicingService } from "@/modules/invoicing";

// Qualified record types for the link layer.
const TIME_ENTRY = "timetracking:TimeEntry";
const INVOICE = "invoicing:Invoice";
const BILLED_ON = "billed_on";

export interface InvoiceFromTimeEntriesInput {
  organizationId: string;
  clientName: string;
  currency: string;
  issueDate: Date;
  /** Flat hourly rate applied to every entry, in minor units. */
  hourlyRateCents: number;
  timeEntryIds: string[];
  actorUserId: string;
}

interface Context extends InvoiceFromTimeEntriesInput {
  entries?: { id: string; description: string; durationMinutes: number }[];
  invoiceId?: string;
}

/**
 * Workflow: turn billable time entries into an invoice.
 *
 * Spans the timetracking and invoicing modules. Each step has a
 * compensation, so a failure part-way through (for example a
 * linking error after the invoice was created) unwinds cleanly
 * and leaves no half-billed state.
 */
export async function invoiceFromTimeEntries(
  input: InvoiceFromTimeEntriesInput,
): Promise<{ ok: boolean; invoiceId?: string; error?: string }> {
  const context: Context = { ...input };

  const steps: WorkflowStep<Context>[] = [
    {
      name: "load-billable-time-entries",
      async run(ctx) {
        const entries = await prisma.timeEntry.findMany({
          where: {
            id: { in: ctx.timeEntryIds },
            organizationId: ctx.organizationId,
            billable: true,
          },
          select: { id: true, description: true, durationMinutes: true },
        });
        if (entries.length === 0) {
          throw new Error("No billable time entries matched the request");
        }
        for (const entry of entries) {
          const billed = await linkService.listTargets(
            { type: TIME_ENTRY, id: entry.id },
            BILLED_ON,
          );
          if (billed.length > 0) {
            throw new Error(`Time entry ${entry.id} is already billed`);
          }
        }
        ctx.entries = entries;
      },
    },
    {
      name: "create-invoice",
      async run(ctx) {
        const lines = (ctx.entries ?? []).map((entry) => ({
          description: entry.description,
          quantity: 1,
          unitAmountCents: Math.round(
            (entry.durationMinutes / 60) * ctx.hourlyRateCents,
          ),
        }));
        const invoice = await invoicingService.createInvoice({
          organizationId: ctx.organizationId,
          clientName: ctx.clientName,
          clientAddress: null,
          currency: ctx.currency,
          issueDate: ctx.issueDate,
          dueDate: null,
          notes: "Generated from time entries",
          lines,
          actorUserId: ctx.actorUserId,
        });
        ctx.invoiceId = invoice.id;
      },
      async compensate(ctx) {
        if (ctx.invoiceId) {
          await invoicingService.deleteInvoice(
            ctx.organizationId,
            ctx.invoiceId,
          );
        }
      },
    },
    {
      name: "link-time-entries-to-invoice",
      async run(ctx) {
        if (!ctx.invoiceId) throw new Error("Invoice was not created");
        for (const entry of ctx.entries ?? []) {
          await linkService.link({
            organizationId: ctx.organizationId,
            from: { type: TIME_ENTRY, id: entry.id },
            to: { type: INVOICE, id: ctx.invoiceId },
            relation: BILLED_ON,
          });
        }
      },
      async compensate(ctx) {
        if (!ctx.invoiceId) return;
        for (const entry of ctx.entries ?? []) {
          await linkService.unlink({
            from: { type: TIME_ENTRY, id: entry.id },
            to: { type: INVOICE, id: ctx.invoiceId },
            relation: BILLED_ON,
          });
        }
      },
    },
  ];

  const result = await runWorkflow(
    "invoice-from-time-entries",
    context,
    steps,
  );
  return {
    ok: result.ok,
    invoiceId: result.ok ? context.invoiceId : undefined,
    error: result.error,
  };
}
