import { z } from "zod";
import { handler, ok, parseBody } from "@/core/http";
import { logger } from "@/core/logger";
import { requireRolesForApi } from "@/modules/rbac";
import { timeTrackingService } from "@/modules/timetracking";

type RouteContext = { params: Promise<{ orgId: string }> };

// GET /api/orgs/:orgId/projects — list the org's projects.
// Pass ?archived=true to include archived projects.
export const GET = handler(async (request, context: RouteContext) => {
  const { orgId } = await context.params;

  const gate = await requireRolesForApi(orgId, []);
  if (!gate.ok) return gate.response;

  const includeArchived =
    new URL(request.url).searchParams.get("archived") === "true";
  const projects = await timeTrackingService.listProjects(
    orgId,
    includeArchived,
  );
  return ok({ projects });
});

const createProjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).optional(),
});

// POST /api/orgs/:orgId/projects — create a project. Admin only.
export const POST = handler(async (request, context: RouteContext) => {
  const { orgId } = await context.params;

  const gate = await requireRolesForApi(orgId, ["admin"]);
  if (!gate.ok) return gate.response;

  const body = await parseBody(request, createProjectSchema);
  if (!body.ok) return body.response;

  const project = await timeTrackingService.createProject({
    organizationId: orgId,
    name: body.data.name,
    code: body.data.code ?? null,
    actorUserId: gate.context.user.id,
  });
  logger.info("Project created", { orgId, projectId: project.id });
  return ok({ project }, { status: 201 });
});
