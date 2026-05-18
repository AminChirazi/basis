import { z } from "zod";
import { fail, handler, notFound, ok, parseBody } from "@/core/http";
import { logger } from "@/core/logger";
import { isOwner, rbacService, requireRolesForApi } from "@/modules/rbac";

type RouteContext = { params: Promise<{ orgId: string }> };

const roleChangeSchema = z.object({
  membershipId: z.string().min(1),
  roleId: z.string().min(1),
});

// GET /api/orgs/:orgId/roles:list the roles defined in the org.
export const GET = handler(async (_request, context: RouteContext) => {
  const { orgId } = await context.params;

  const gate = await requireRolesForApi(orgId, ["admin"]);
  if (!gate.ok) return gate.response;

  const roles = await rbacService.listRoles(orgId);
  return ok({ roles });
});

// POST /api/orgs/:orgId/roles:assign a role to a member.
// Owner-only: changing who holds which role is a privileged action.
export const POST = handler(async (request, context: RouteContext) => {
  const { orgId } = await context.params;

  const gate = await requireRolesForApi(orgId, []);
  if (!gate.ok) return gate.response;
  if (!isOwner(gate.context.roleKeys)) {
    return fail(403, "Only an owner can assign roles");
  }

  const body = await parseBody(request, roleChangeSchema);
  if (!body.ok) return body.response;

  const result = await rbacService.assignRole({
    organizationId: orgId,
    membershipId: body.data.membershipId,
    roleId: body.data.roleId,
    actorUserId: gate.context.user.id,
  });
  if (!result.ok) {
    return result.reason === "membership_not_found"
      ? notFound("Membership")
      : notFound("Role");
  }

  logger.info("Role assigned", {
    orgId,
    membershipId: body.data.membershipId,
  });
  return ok({ assigned: true, alreadyHeld: result.alreadyHeld });
});

// DELETE /api/orgs/:orgId/roles:remove a role from a member.
// Owner-only, and guarded so an org can never lose its last owner.
export const DELETE = handler(async (request, context: RouteContext) => {
  const { orgId } = await context.params;

  const gate = await requireRolesForApi(orgId, []);
  if (!gate.ok) return gate.response;
  if (!isOwner(gate.context.roleKeys)) {
    return fail(403, "Only an owner can change roles");
  }

  const body = await parseBody(request, roleChangeSchema);
  if (!body.ok) return body.response;

  const result = await rbacService.removeRole({
    organizationId: orgId,
    membershipId: body.data.membershipId,
    roleId: body.data.roleId,
    actorUserId: gate.context.user.id,
  });
  if (!result.ok) {
    return result.reason === "role_not_found"
      ? notFound("Role")
      : fail(409, "Cannot remove the last owner of the organization");
  }

  logger.info("Role removed", {
    orgId,
    membershipId: body.data.membershipId,
  });
  return ok({ removed: result.removed });
});
