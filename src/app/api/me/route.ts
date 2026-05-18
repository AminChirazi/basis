import { getCurrentUser } from "@/auth";
import { identityService } from "@/modules/identity";
import { handler, ok, unauthorized } from "@/core/http";

// GET /api/me — the signed-in user and the organizations they
// belong to, with the role keys they hold in each.
export const GET = handler(async () => {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const organizations = await identityService.listUserOrganizations(user.id);
  return ok({ user, organizations });
});
