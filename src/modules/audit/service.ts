import { prisma } from "@/core/db";

/** A change to record in the audit trail. */
export interface AuditEventInput {
  organizationId: string;
  /** User id of the actor, or null for system actions. */
  actorUserId?: string | null;
  /** Verb describing what happened, e.g. "role.assigned". */
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  /** Extra structured context. JSON-primitive values only. */
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Audit module service.
 *
 * Owns the append-only audit trail. Modules that need their write
 * to be atomic with the audited change (such as rbac) include the
 * audit row in their own transaction; everything else records
 * through `record()`.
 */
export const auditService = {
  /** Record a single audit event in its own transaction. */
  async record(event: AuditEventInput): Promise<void> {
    await prisma.auditEvent.create({
      data: {
        organizationId: event.organizationId,
        actorUserId: event.actorUserId,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        metadata: event.metadata,
      },
    });
  },

  /** List the most recent audit events for an organization. */
  async list(organizationId: string, limit = 50) {
    return prisma.auditEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
