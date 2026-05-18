import { prisma } from "@/core/db";
import { auditService } from "@/modules/audit";

export interface CreateProjectInput {
  organizationId: string;
  name: string;
  code: string | null;
  actorUserId: string;
}

export interface LogTimeInput {
  organizationId: string;
  membershipId: string;
  description: string;
  startedAt: Date;
  durationMinutes: number;
  projectId?: string;
  billable: boolean;
}

/**
 * Time tracking module service.
 *
 * Owns projects and the time entries logged against them. Every
 * entry belongs to a membership, so "who logged it" is always
 * scoped to one organization.
 */
export const timeTrackingService = {
  /** List an organization's projects. */
  async listProjects(organizationId: string, includeArchived = false) {
    return prisma.project.findMany({
      where: {
        organizationId,
        ...(includeArchived ? {} : { archived: false }),
      },
      orderBy: { name: "asc" },
    });
  },

  /** Create a project. Records an audit event. */
  async createProject(input: CreateProjectInput) {
    const project = await prisma.project.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        code: input.code,
      },
    });
    await auditService.record({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "project.created",
      targetType: "Project",
      targetId: project.id,
      metadata: { name: project.name },
    });
    return project;
  },

  /** List time entries for an organization, optionally one project. */
  async listTimeEntries(params: {
    organizationId: string;
    projectId?: string;
  }) {
    return prisma.timeEntry.findMany({
      where: {
        organizationId: params.organizationId,
        ...(params.projectId ? { projectId: params.projectId } : {}),
      },
      orderBy: { startedAt: "desc" },
    });
  },

  /** Log a stretch of work. The project, if given, must be in the org. */
  async logTime(input: LogTimeInput) {
    if (input.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, organizationId: input.organizationId },
        select: { id: true },
      });
      if (!project) {
        return { ok: false as const, reason: "project_not_found" as const };
      }
    }
    const timeEntry = await prisma.timeEntry.create({
      data: {
        organizationId: input.organizationId,
        membershipId: input.membershipId,
        projectId: input.projectId ?? null,
        description: input.description,
        startedAt: input.startedAt,
        durationMinutes: input.durationMinutes,
        billable: input.billable,
      },
    });
    return { ok: true as const, timeEntry };
  },

  /** Delete a time entry. Records an audit event. */
  async deleteTimeEntry(params: {
    organizationId: string;
    timeEntryId: string;
    actorUserId: string;
  }) {
    const entry = await prisma.timeEntry.findFirst({
      where: { id: params.timeEntryId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!entry) return { ok: false as const };

    await prisma.timeEntry.delete({ where: { id: entry.id } });
    await auditService.record({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: "time_entry.deleted",
      targetType: "TimeEntry",
      targetId: params.timeEntryId,
    });
    return { ok: true as const };
  },
};
