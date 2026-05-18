// RBAC module: roles, role assignments, and access gates.
export { rbacService } from "@/modules/rbac/service";
export type {
  RoleSummary,
  AssignResult,
  RemoveResult,
} from "@/modules/rbac/service";
export {
  DEFAULT_ROLES,
  OWNER_ROLE_KEY,
  hasAnyRole,
  hasRoleOrOwner,
  isOwner,
} from "@/modules/rbac/roles";
export type { DefaultRoleKey } from "@/modules/rbac/roles";
export { resolveOrgContext, requireRolesForApi } from "@/modules/rbac/require";
export type { OrgContext } from "@/modules/rbac/require";
