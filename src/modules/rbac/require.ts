import type { NextResponse } from "next/server";
import { getCurrentUser } from "@/auth";
import type { SessionUser } from "@/auth/types";
import { identityService } from "@/modules/identity";
import { hasRoleOrOwner } from "@/modules/rbac/roles";
import { forbidden, unauthorized } from "@/core/http";

/** A signed-in user resolved within the scope of one organization. */
export interface OrgContext {
  user: SessionUser;
  organizationId: string;
  membershipId: string;
  roleKeys: string[];
}

/** Resolve a user's membership and role keys for one organization. */
export async function resolveOrgContext(
  user: SessionUser,
  organizationId: string,
): Promise<OrgContext | null> {
  const membership = await identityService.findMembership(
    user.id,
    organizationId,
  );
  if (!membership) return null;
  return {
    user,
    organizationId,
    membershipId: membership.id,
    roleKeys: membership.roles.map((r) => r.role.key),
  };
}

type GateResult =
  | { ok: true; context: OrgContext }
  | { ok: false; response: NextResponse };

/**
 * API gate: require the signed-in user to be a member of the
 * organization and to hold one of `roles` (or be an owner).
 *
 * Pass an empty `roles` array to require membership only, then
 * combine with `isOwner(context.roleKeys)` for owner-only actions.
 */
export async function requireRolesForApi(
  organizationId: string,
  roles: readonly string[],
): Promise<GateResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, response: unauthorized() };

  const context = await resolveOrgContext(user, organizationId);
  if (!context) return { ok: false, response: forbidden() };

  if (roles.length > 0 && !hasRoleOrOwner(context.roleKeys, roles)) {
    return { ok: false, response: forbidden() };
  }
  return { ok: true, context };
}
