import { z } from "zod";
import { handler, notFound, ok, parseBody } from "@/core/http";
import { logger } from "@/core/logger";
import { requireRolesForApi } from "@/modules/rbac";
import { INVOICE_STATUSES, invoicingService } from "@/modules/invoicing";

type RouteContext = {
  params: Promise<{ orgId: string; invoiceId: string }>;
};

// GET /api/orgs/:orgId/invoices/:invoiceId:one invoice with its
// line items. Admin only.
export const GET = handler(async (_request, context: RouteContext) => {
  const { orgId, invoiceId } = await context.params;

  const gate = await requireRolesForApi(orgId, ["admin"]);
  if (!gate.ok) return gate.response;

  const invoice = await invoicingService.getInvoice(orgId, invoiceId);
  if (!invoice) return notFound("Invoice");
  return ok({ invoice });
});

const updateStatusSchema = z.object({
  status: z.enum(INVOICE_STATUSES),
});

// PATCH /api/orgs/:orgId/invoices/:invoiceId:change the invoice
// status. Admin only.
export const PATCH = handler(async (request, context: RouteContext) => {
  const { orgId, invoiceId } = await context.params;

  const gate = await requireRolesForApi(orgId, ["admin"]);
  if (!gate.ok) return gate.response;

  const body = await parseBody(request, updateStatusSchema);
  if (!body.ok) return body.response;

  const result = await invoicingService.updateStatus({
    organizationId: orgId,
    invoiceId,
    status: body.data.status,
    actorUserId: gate.context.user.id,
  });
  if (!result.ok) return notFound("Invoice");

  logger.info("Invoice status changed", {
    orgId,
    invoiceId,
    status: body.data.status,
  });
  return ok({ invoice: result.invoice });
});
