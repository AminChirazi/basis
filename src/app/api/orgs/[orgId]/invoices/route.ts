import { z } from "zod";
import { handler, ok, parseBody } from "@/core/http";
import { logger } from "@/core/logger";
import { requireRolesForApi } from "@/modules/rbac";
import { invoicingService } from "@/modules/invoicing";

type RouteContext = { params: Promise<{ orgId: string }> };

// GET /api/orgs/:orgId/invoices:list invoices. Admin only.
// Pass ?status=draft|sent|paid|void to filter.
export const GET = handler(async (request, context: RouteContext) => {
  const { orgId } = await context.params;

  const gate = await requireRolesForApi(orgId, ["admin"]);
  if (!gate.ok) return gate.response;

  const status = new URL(request.url).searchParams.get("status") ?? undefined;
  const invoices = await invoicingService.listInvoices(orgId, status);
  return ok({ invoices });
});

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitAmountCents: z.number().int().nonnegative(),
});

const createInvoiceSchema = z.object({
  clientName: z.string().min(1),
  clientAddress: z.string().min(1).optional(),
  currency: z.string().length(3),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().min(1).optional(),
  lines: z.array(lineSchema).min(1),
});

// POST /api/orgs/:orgId/invoices:create an invoice. Admin only.
export const POST = handler(async (request, context: RouteContext) => {
  const { orgId } = await context.params;

  const gate = await requireRolesForApi(orgId, ["admin"]);
  if (!gate.ok) return gate.response;

  const body = await parseBody(request, createInvoiceSchema);
  if (!body.ok) return body.response;

  const invoice = await invoicingService.createInvoice({
    organizationId: orgId,
    clientName: body.data.clientName,
    clientAddress: body.data.clientAddress ?? null,
    currency: body.data.currency.toUpperCase(),
    issueDate: body.data.issueDate,
    dueDate: body.data.dueDate ?? null,
    notes: body.data.notes ?? null,
    lines: body.data.lines,
    actorUserId: gate.context.user.id,
  });
  logger.info("Invoice created", {
    orgId,
    invoiceId: invoice.id,
    number: invoice.number,
  });
  return ok({ invoice }, { status: 201 });
});
