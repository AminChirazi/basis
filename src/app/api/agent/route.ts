import { z } from "zod";
import { getCurrentUser } from "@/auth";
import { fail, handler, ok, parseBody } from "@/core/http";
import { logger } from "@/core/logger";
import { identityService } from "@/modules/identity";
import { resolveOrgContext } from "@/modules/rbac";
import { runAgent } from "@/agent/run";

const bodySchema = z.object({
  message: z.string().min(1),
});

// POST /api/agent: run the back office agent for one user message.
// The agent operates on the caller's organization, as the caller.
export const POST = handler(async (request) => {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Not authenticated");

  const organizations = await identityService.listUserOrganizations(user.id);
  const org = organizations[0];
  if (!org) return fail(403, "No organization");

  const context = await resolveOrgContext(user, org.id);
  if (!context) return fail(403, "Not a member of the organization");

  const body = await parseBody(request, bodySchema);
  if (!body.ok) return body.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return fail(503, "ANTHROPIC_API_KEY is not configured");
  }

  const result = await runAgent({
    message: body.data.message,
    context: {
      organizationId: context.organizationId,
      membershipId: context.membershipId,
      userId: user.id,
    },
  });
  logger.info("Agent run completed", {
    orgId: org.id,
    steps: result.steps.map((step) => step.tool),
  });
  return ok(result);
});
