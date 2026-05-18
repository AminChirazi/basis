"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/auth";
import { hasRoleOrOwner, resolveOrgContext } from "@/modules/rbac";
import { timeTrackingService } from "@/modules/timetracking";

/** Server action: create a project from the dashboard form. */
export async function createProjectAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const orgId = String(formData.get("orgId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!orgId || !name) {
    throw new Error("Organization and project name are required");
  }

  const context = await resolveOrgContext(user, orgId);
  if (!context || !hasRoleOrOwner(context.roleKeys, ["admin"])) {
    throw new Error("Not authorized to create projects");
  }

  await timeTrackingService.createProject({
    organizationId: orgId,
    name,
    code: null,
    actorUserId: user.id,
  });
  revalidatePath("/");
}
