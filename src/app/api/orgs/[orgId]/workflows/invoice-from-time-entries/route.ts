import { z } from "zod";
import { fail, handler, ok, parseBody } from "@/core/http";
import { logger } from "@/core/logger";
import { invoicingService } from "@/modules/invoicing";
import { requireRolesForApi } from "@/modules/rbac";
import { invoiceFromTimeEntries } from "@/workflows/invoice-from-time-entries";

type RouteContext = { params: Promise<{ orgId: string }> };

const inputSchema = z.object({
  clientName: z.string().min(1),
  currency: z.string().length(3),
  issueDate: z.coerce.date(),
  hourlyRateCents: z.number().int().positive(),
  timeEntryIds: z.array(z.string().min(1)).min(1),
});

// POST /api/orgs/:orgId/workflows/invoice-from-time-entries
// Runs the workflow that turns billable time entries into an
// invoice and links them. Admin only.
export const POST = handler(async (request, context: RouteContext) => {
  const { orgId } = await context.params;

  const gate = await requireRolesForApi(orgId, ["admin"]);
  if (!gate.ok) return gate.response;

  const body = await parseBody(request, inputSchema);
  if (!body.ok) return body.response;

  const result = await invoiceFromTimeEntries({
    organizationId: orgId,
    clientName: body.data.clientName,
    currency: body.data.currency.toUpperCase(),
    issueDate: body.data.issueDate,
    hourlyRateCents: body.data.hourlyRateCents,
    timeEntryIds: body.data.timeEntryIds,
    actorUserId: gate.context.user.id,
  });

  if (!result.ok) {
    return fail(409, result.error ?? "Workflow failed");
  }

  const invoice = result.invoiceId
    ? await invoicingService.getInvoice(orgId, result.invoiceId)
    : null;
  logger.info("Workflow invoice-from-time-entries completed", {
    orgId,
    invoiceId: result.invoiceId,
  });
  return ok({ invoice }, { status: 201 });
});
