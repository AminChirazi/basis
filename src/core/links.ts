import { prisma } from "@/core/db";

/** One end of a link: a record identified by "module:Type" and id. */
export interface LinkRef {
  /** Qualified type, e.g. "timetracking:TimeEntry". */
  type: string;
  id: string;
}

/**
 * Link service.
 *
 * Records typed associations between data owned by different
 * modules, so modules never need a foreign key across the module
 * boundary. This is Basis's lightweight take on Medusa's module
 * links: one generic table instead of a generated table per link.
 */
export const linkService = {
  /** Associate two records. Idempotent. */
  async link(params: {
    organizationId: string;
    from: LinkRef;
    to: LinkRef;
    relation: string;
  }): Promise<void> {
    await prisma.link.upsert({
      where: {
        fromType_fromId_toType_toId_relation: {
          fromType: params.from.type,
          fromId: params.from.id,
          toType: params.to.type,
          toId: params.to.id,
          relation: params.relation,
        },
      },
      update: {},
      create: {
        organizationId: params.organizationId,
        fromType: params.from.type,
        fromId: params.from.id,
        toType: params.to.type,
        toId: params.to.id,
        relation: params.relation,
      },
    });
  },

  /** Remove an association. */
  async unlink(params: {
    from: LinkRef;
    to: LinkRef;
    relation: string;
  }): Promise<void> {
    await prisma.link.deleteMany({
      where: {
        fromType: params.from.type,
        fromId: params.from.id,
        toType: params.to.type,
        toId: params.to.id,
        relation: params.relation,
      },
    });
  },

  /** List the records `from` is linked to by `relation`. */
  async listTargets(from: LinkRef, relation: string): Promise<LinkRef[]> {
    const rows = await prisma.link.findMany({
      where: { fromType: from.type, fromId: from.id, relation },
      select: { toType: true, toId: true },
    });
    return rows.map((r) => ({ type: r.toType, id: r.toId }));
  },

  /** List the records linked to `to` by `relation`. */
  async listSources(to: LinkRef, relation: string): Promise<LinkRef[]> {
    const rows = await prisma.link.findMany({
      where: { toType: to.type, toId: to.id, relation },
      select: { fromType: true, fromId: true },
    });
    return rows.map((r) => ({ type: r.fromType, id: r.fromId }));
  },
};
