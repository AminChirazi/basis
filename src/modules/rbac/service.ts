import { prisma } from "@/core/db";
import { OWNER_ROLE_KEY } from "@/modules/rbac/roles";

/** A role defined within an organization. */
export interface RoleSummary {
  id: string;
  key: string;
  name: string;
  description: string | null;
  ord: number;
}

export type AssignResult =
  | { ok: true; alreadyHeld: boolean }
  | { ok: false; reason: "membership_not_found" | "role_not_found" };

export type RemoveResult =
  | { ok: true; removed: boolean }
  | { ok: false; reason: "role_not_found" | "last_owner" };

interface RoleChange {
  organizationId: string;
  membershipId: string;
  roleId: string;
  actorUserId: string;
}

/**
 * RBAC module service.
 *
 * Owns roles and the membership-to-role assignments. Mutations
 * write an audit row inside the same transaction as the change
 * itself, so the audit trail can never drift from reality.
 */
export const rbacService = {
  /** List the roles defined in an organization. */
  async listRoles(organizationId: string): Promise<RoleSummary[]> {
    return prisma.role.findMany({
      where: { organizationId },
      orderBy: { ord: "asc" },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        ord: true,
      },
    });
  },

  /** Assign a role to a member. */
  async assignRole(change: RoleChange): Promise<AssignResult> {
    const { organizationId, membershipId, roleId, actorUserId } = change;

    const [membership, role] = await Promise.all([
      prisma.membership.findFirst({
        where: { id: membershipId, organizationId },
        select: { id: true },
      }),
      prisma.role.findFirst({
        where: { id: roleId, organizationId },
        select: { id: true, key: true },
      }),
    ]);
    if (!membership) return { ok: false, reason: "membership_not_found" };
    if (!role) return { ok: false, reason: "role_not_found" };

    const existing = await prisma.membershipRole.findUnique({
      where: { membershipId_roleId: { membershipId, roleId } },
      select: { id: true },
    });
    if (existing) return { ok: true, alreadyHeld: true };

    await prisma.$transaction([
      prisma.membershipRole.create({
        data: { membershipId, roleId, assignedById: actorUserId },
      }),
      prisma.auditEvent.create({
        data: {
          organizationId,
          actorUserId,
          action: "role.assigned",
          targetType: "Membership",
          targetId: membershipId,
          metadata: { roleId, roleKey: role.key },
        },
      }),
    ]);
    return { ok: true, alreadyHeld: false };
  },

  /**
   * Remove a role from a member. Refuses to remove the last owner,
   * so an organization can never lock itself out of management.
   */
  async removeRole(change: RoleChange): Promise<RemoveResult> {
    const { organizationId, membershipId, roleId, actorUserId } = change;

    const role = await prisma.role.findFirst({
      where: { id: roleId, organizationId },
      select: { id: true, key: true },
    });
    if (!role) return { ok: false, reason: "role_not_found" };

    if (role.key === OWNER_ROLE_KEY) {
      const ownerCount = await prisma.membershipRole.count({
        where: { role: { organizationId, key: OWNER_ROLE_KEY } },
      });
      if (ownerCount <= 1) return { ok: false, reason: "last_owner" };
    }

    const deleted = await prisma.membershipRole.deleteMany({
      where: { membershipId, roleId },
    });
    if (deleted.count === 0) return { ok: true, removed: false };

    await prisma.auditEvent.create({
      data: {
        organizationId,
        actorUserId,
        action: "role.removed",
        targetType: "Membership",
        targetId: membershipId,
        metadata: { roleId, roleKey: role.key },
      },
    });
    return { ok: true, removed: true };
  },
};
