import { z } from "zod";
import { handler, notFound, ok, parseBody } from "@/core/http";
import { logger } from "@/core/logger";
import { requireRolesForApi } from "@/modules/rbac";
import { timeTrackingService } from "@/modules/timetracking";

type RouteContext = { params: Promise<{ orgId: string }> };

// GET /api/orgs/:orgId/time-entries — list time entries.
// Pass ?projectId=... to filter to one project.
export const GET = handler(async (request, context: RouteContext) => {
  const { orgId } = await context.params;

  const gate = await requireRolesForApi(orgId, []);
  if (!gate.ok) return gate.response;

  const projectId = new URL(request.url).searchParams.get("projectId");
  const timeEntries = await timeTrackingService.listTimeEntries({
    organizationId: orgId,
    projectId: projectId ?? undefined,
  });
  return ok({ timeEntries });
});

const logTimeSchema = z.object({
  description: z.string().min(1),
  startedAt: z.coerce.date(),
  durationMinutes: z.number().int().positive(),
  projectId: z.string().min(1).optional(),
  billable: z.boolean().optional(),
});

// POST /api/orgs/:orgId/time-entries — log time. Any member; the
// entry is attributed to the caller's own membership.
export const POST = handler(async (request, context: RouteContext) => {
  const { orgId } = await context.params;

  const gate = await requireRolesForApi(orgId, []);
  if (!gate.ok) return gate.response;

  const body = await parseBody(request, logTimeSchema);
  if (!body.ok) return body.response;

  const result = await timeTrackingService.logTime({
    organizationId: orgId,
    membershipId: gate.context.membershipId,
    description: body.data.description,
    startedAt: body.data.startedAt,
    durationMinutes: body.data.durationMinutes,
    projectId: body.data.projectId,
    billable: body.data.billable ?? true,
  });
  if (!result.ok) return notFound("Project");

  return ok({ timeEntry: result.timeEntry }, { status: 201 });
});

const deleteSchema = z.object({
  timeEntryId: z.string().min(1),
});

// DELETE /api/orgs/:orgId/time-entries — delete a time entry. Admin only.
export const DELETE = handler(async (request, context: RouteContext) => {
  const { orgId } = await context.params;

  const gate = await requireRolesForApi(orgId, ["admin"]);
  if (!gate.ok) return gate.response;

  const body = await parseBody(request, deleteSchema);
  if (!body.ok) return body.response;

  const result = await timeTrackingService.deleteTimeEntry({
    organizationId: orgId,
    timeEntryId: body.data.timeEntryId,
    actorUserId: gate.context.user.id,
  });
  if (!result.ok) return notFound("Time entry");

  logger.info("Time entry deleted", {
    orgId,
    timeEntryId: body.data.timeEntryId,
  });
  return ok({ deleted: true });
});
