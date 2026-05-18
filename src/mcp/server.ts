import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { identityService } from "@/modules/identity";
import { timeTrackingService } from "@/modules/timetracking";
import { invoicingService } from "@/modules/invoicing";
import { auditService } from "@/modules/audit";
import { invoiceFromTimeEntries } from "@/workflows/invoice-from-time-entries";

/**
 * Basis MCP server.
 *
 * Exposes the back office operations as MCP tools so an AI agent
 * can drive Basis directly. This is the agent interface the
 * project is built for.
 *
 * It runs as a trusted local process and does not enforce
 * HTTP-level RBAC; run it only where the operator is already
 * authorised. Mutations are attributed to `BASIS_MCP_ACTOR_USER_ID`
 * in the audit trail.
 */
const ACTOR = process.env.BASIS_MCP_ACTOR_USER_ID ?? "mcp-agent";

const server = new McpServer({ name: "basis", version: "0.1.0" });

/** Wrap any value as an MCP text result. */
function result(data: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(data, null, 2) },
    ],
  };
}

server.registerTool(
  "list_organizations",
  {
    title: "List organizations",
    description: "List every organization in this Basis deployment.",
    inputSchema: {},
  },
  async () => result(await identityService.listAllOrganizations()),
);

server.registerTool(
  "list_members",
  {
    title: "List members",
    description:
      "List the members of an organization with their role keys.",
    inputSchema: { organizationId: z.string() },
  },
  async ({ organizationId }) =>
    result(await identityService.listMembers(organizationId)),
);

server.registerTool(
  "list_projects",
  {
    title: "List projects",
    description: "List an organization's time tracking projects.",
    inputSchema: { organizationId: z.string() },
  },
  async ({ organizationId }) =>
    result(await timeTrackingService.listProjects(organizationId)),
);

server.registerTool(
  "create_project",
  {
    title: "Create project",
    description: "Create a time tracking project in an organization.",
    inputSchema: {
      organizationId: z.string(),
      name: z.string(),
      code: z.string().optional(),
    },
  },
  async ({ organizationId, name, code }) =>
    result(
      await timeTrackingService.createProject({
        organizationId,
        name,
        code: code ?? null,
        actorUserId: ACTOR,
      }),
    ),
);

server.registerTool(
  "log_time",
  {
    title: "Log time",
    description: "Log a time entry against a project for a member.",
    inputSchema: {
      organizationId: z.string(),
      membershipId: z.string(),
      description: z.string(),
      startedAt: z.string().describe("ISO 8601 timestamp"),
      durationMinutes: z.number().int().positive(),
      projectId: z.string().optional(),
      billable: z.boolean().optional(),
    },
  },
  async (args) =>
    result(
      await timeTrackingService.logTime({
        organizationId: args.organizationId,
        membershipId: args.membershipId,
        description: args.description,
        startedAt: new Date(args.startedAt),
        durationMinutes: args.durationMinutes,
        projectId: args.projectId,
        billable: args.billable ?? true,
      }),
    ),
);

server.registerTool(
  "list_time_entries",
  {
    title: "List time entries",
    description:
      "List time entries for an organization, optionally one project.",
    inputSchema: {
      organizationId: z.string(),
      projectId: z.string().optional(),
    },
  },
  async ({ organizationId, projectId }) =>
    result(
      await timeTrackingService.listTimeEntries({ organizationId, projectId }),
    ),
);

server.registerTool(
  "list_invoices",
  {
    title: "List invoices",
    description:
      "List an organization's invoices, optionally filtered by status.",
    inputSchema: {
      organizationId: z.string(),
      status: z.string().optional(),
    },
  },
  async ({ organizationId, status }) =>
    result(await invoicingService.listInvoices(organizationId, status)),
);

server.registerTool(
  "invoice_from_time_entries",
  {
    title: "Invoice from time entries",
    description:
      "Run the workflow that bills time entries into a new invoice.",
    inputSchema: {
      organizationId: z.string(),
      clientName: z.string(),
      currency: z.string().length(3),
      issueDate: z.string().describe("ISO 8601 date"),
      hourlyRateCents: z.number().int().positive(),
      timeEntryIds: z.array(z.string()).min(1),
    },
  },
  async (args) =>
    result(
      await invoiceFromTimeEntries({
        organizationId: args.organizationId,
        clientName: args.clientName,
        currency: args.currency.toUpperCase(),
        issueDate: new Date(args.issueDate),
        hourlyRateCents: args.hourlyRateCents,
        timeEntryIds: args.timeEntryIds,
        actorUserId: ACTOR,
      }),
    ),
);

server.registerTool(
  "recent_audit_events",
  {
    title: "Recent audit events",
    description: "List recent audit events for an organization.",
    inputSchema: {
      organizationId: z.string(),
      limit: z.number().int().positive().optional(),
    },
  },
  async ({ organizationId, limit }) =>
    result(await auditService.list(organizationId, limit ?? 20)),
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Basis MCP server running on stdio.");
}

main().catch((error) => {
  console.error("Basis MCP server failed to start:", error);
  process.exit(1);
});
