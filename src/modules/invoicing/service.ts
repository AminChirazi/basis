import { prisma } from "@/core/db";
import { auditService } from "@/modules/audit";

/** The statuses an invoice can move through. */
export const INVOICE_STATUSES = ["draft", "sent", "paid", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitAmountCents: number;
}

export interface CreateInvoiceInput {
  organizationId: string;
  clientName: string;
  clientAddress: string | null;
  currency: string;
  issueDate: Date;
  dueDate: Date | null;
  notes: string | null;
  lines: InvoiceLineInput[];
  actorUserId: string;
}

/**
 * Invoicing module service.
 *
 * Owns invoices and their line items. All amounts are integers in
 * minor units (e.g. cents); line and invoice totals are computed
 * and stored so they can never drift from the lines.
 */
export const invoicingService = {
  /** List an organization's invoices, optionally filtered by status. */
  async listInvoices(organizationId: string, status?: string) {
    return prisma.invoice.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Fetch a single invoice with its line items. */
  async getInvoice(organizationId: string, invoiceId: string) {
    return prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: { lines: true },
    });
  },

  /** Create an invoice with line items. The number is generated. */
  async createInvoice(input: CreateInvoiceInput) {
    const lines = input.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitAmountCents: line.unitAmountCents,
      amountCents: line.quantity * line.unitAmountCents,
    }));
    const totalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);

    const invoice = await prisma.$transaction(async (tx) => {
      // Per-organization sequential number. A high-volume
      // deployment should back this with a database sequence;
      // count-then-create is fine at the scale Basis starts at.
      const count = await tx.invoice.count({
        where: { organizationId: input.organizationId },
      });
      const number = `INV-${String(count + 1).padStart(4, "0")}`;

      return tx.invoice.create({
        data: {
          organizationId: input.organizationId,
          number,
          currency: input.currency,
          clientName: input.clientName,
          clientAddress: input.clientAddress,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          notes: input.notes,
          totalCents,
          lines: { create: lines },
        },
        include: { lines: true },
      });
    });

    await auditService.record({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "invoice.created",
      targetType: "Invoice",
      targetId: invoice.id,
      metadata: { number: invoice.number, totalCents },
    });
    return invoice;
  },

  /** Move an invoice to a new status. */
  async updateStatus(params: {
    organizationId: string;
    invoiceId: string;
    status: InvoiceStatus;
    actorUserId: string;
  }) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.invoiceId, organizationId: params.organizationId },
      select: { id: true, status: true },
    });
    if (!invoice) return { ok: false as const };

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: params.status },
      include: { lines: true },
    });
    await auditService.record({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: "invoice.status_changed",
      targetType: "Invoice",
      targetId: params.invoiceId,
      metadata: { from: invoice.status, to: params.status },
    });
    return { ok: true as const, invoice: updated };
  },
};
