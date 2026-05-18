import { prisma } from "@/core/db";

/** An organization a user belongs to, with the role keys they hold. */
export interface OrganizationSummary {
  id: string;
  slug: string;
  name: string;
  roles: string[];
}

/** A membership resolved with the role keys attached to it. */
export interface MembershipWithRoles {
  id: string;
  roles: { role: { key: string } }[];
}

/**
 * Identity module service.
 *
 * Owns users, organizations, and the membership that links them.
 * This service is the module's only public surface; other modules
 * and route handlers never touch the identity tables directly.
 */
export const identityService = {
  /** List the organizations a user belongs to and the roles held. */
  async listUserOrganizations(
    userId: string,
  ): Promise<OrganizationSummary[]> {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      select: {
        organization: { select: { id: true, slug: true, name: true } },
        roles: { select: { role: { select: { key: true } } } },
      },
    });
    return memberships.map((m) => ({
      id: m.organization.id,
      slug: m.organization.slug,
      name: m.organization.name,
      roles: m.roles.map((r) => r.role.key),
    }));
  },

  /** Find a user's membership in one organization, with role keys. */
  async findMembership(
    userId: string,
    organizationId: string,
  ): Promise<MembershipWithRoles | null> {
    return prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId },
      },
      select: {
        id: true,
        roles: { select: { role: { select: { key: true } } } },
      },
    });
  },
};
