import type Anthropic from "@anthropic-ai/sdk";
import { invoicingService } from "@/modules/invoicing";
import { timeTrackingService } from "@/modules/timetracking";
import { invoiceFromTimeEntries } from "@/workflows/invoice-from-time-entries";

/** The organization scope an agent run operates within. */
export interface AgentContext {
  organizationId: string;
  membershipId: string;
  userId: string;
}

/**
 * The tools the back office agent can call. Each maps to a module
 * service; the organization scope is injected from the request,
 * never chosen by the model.
 */
export const agentTools: Anthropic.Tool[] = [
  {
    name: "list_projects",
    description: "List the organization's time tracking projects.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_project",
    description: "Create a new time tracking project.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        code: { type: "string", description: "Optional short code." },
      },
      required: ["name"],
    },
  },
  {
    name: "log_time",
    description:
      "Log a time entry. startedAt defaults to now. projectName, if given, is matched against existing projects.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string" },
        durationMinutes: { type: "number" },
        projectName: { type: "string" },
        startedAt: { type: "string", description: "ISO 8601 timestamp." },
      },
      required: ["description", "durationMinutes"],
    },
  },
  {
    name: "list_time_entries",
    description: "List the organization's time entries with their ids.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_invoices",
    description: "List the organization's invoices.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "invoice_from_time_entries",
    description:
      "Create an invoice by billing time entries at an hourly rate. Call list_time_entries first to get the entry ids.",
    input_schema: {
      type: "object",
      properties: {
        clientName: { type: "string" },
        currency: { type: "string", description: "ISO 4217 code, e.g. EUR." },
        hourlyRateCents: {
          type: "number",
          description: "Hourly rate in minor units (cents).",
        },
        timeEntryIds: { type: "array", items: { type: "string" } },
      },
      required: ["clientName", "currency", "hourlyRateCents", "timeEntryIds"],
    },
  },
];

/** Execute one tool call against the module services. */
export async function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: AgentContext,
): Promise<unknown> {
  switch (name) {
    case "list_projects":
      return timeTrackingService.listProjects(ctx.organizationId);

    case "create_project":
      return timeTrackingService.createProject({
        organizationId: ctx.organizationId,
        name: String(input.name),
        code: input.code ? String(input.code) : null,
        actorUserId: ctx.userId,
      });

    case "log_time": {
      let projectId: string | undefined;
      if (input.projectName) {
        const projects = await timeTrackingService.listProjects(
          ctx.organizationId,
        );
        const match = projects.find(
          (p) =>
            p.name.toLowerCase() === String(input.projectName).toLowerCase(),
        );
        if (!match) {
          return { error: `No project named "${input.projectName}"` };
        }
        projectId = match.id;
      }
      return timeTrackingService.logTime({
        organizationId: ctx.organizationId,
        membershipId: ctx.membershipId,
        description: String(input.description),
        durationMinutes: Number(input.durationMinutes),
        startedAt: input.startedAt
          ? new Date(String(input.startedAt))
          : new Date(),
        projectId,
        billable: true,
      });
    }

    case "list_time_entries":
      return timeTrackingService.listTimeEntries({
        organizationId: ctx.organizationId,
      });

    case "list_invoices":
      return invoicingService.listInvoices(ctx.organizationId);

    case "invoice_from_time_entries":
      return invoiceFromTimeEntries({
        organizationId: ctx.organizationId,
        clientName: String(input.clientName),
        currency: String(input.currency),
        issueDate: new Date(),
        hourlyRateCents: Number(input.hourlyRateCents),
        timeEntryIds: Array.isArray(input.timeEntryIds)
          ? input.timeEntryIds.map(String)
          : [],
        actorUserId: ctx.userId,
      });

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
