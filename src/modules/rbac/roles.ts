/**
 * Role keys and access helpers.
 *
 * Roles are stored as database rows (see the `Role` model), so an
 * organization can rename or add its own. The keys below are the
 * baseline Basis seeds into every new organization. Access checks
 * always compare by `key`, never by display name or id.
 */
export const DEFAULT_ROLES = [
  {
    key: "owner",
    name: "Owner",
    description: "Full access, including role management.",
    ord: 0,
  },
  {
    key: "admin",
    name: "Admin",
    description: "Manage back office data and members.",
    ord: 10,
  },
  {
    key: "member",
    name: "Member",
    description: "Standard access to assigned areas.",
    ord: 20,
  },
] as const;

export type DefaultRoleKey = (typeof DEFAULT_ROLES)[number]["key"];

/** The owner role is implicitly granted access to everything. */
export const OWNER_ROLE_KEY = "owner";

/** True if `heldKeys` includes any of `wantedKeys`. */
export function hasAnyRole(
  heldKeys: readonly string[],
  wantedKeys: readonly string[],
): boolean {
  if (wantedKeys.length === 0) return false;
  return heldKeys.some((held) => wantedKeys.includes(held));
}

/**
 * True if the user is an owner or holds one of `wantedKeys`.
 * Owner is implicitly granted everything, so gates never need to
 * list it explicitly.
 */
export function hasRoleOrOwner(
  heldKeys: readonly string[],
  wantedKeys: readonly string[],
): boolean {
  if (heldKeys.includes(OWNER_ROLE_KEY)) return true;
  return hasAnyRole(heldKeys, wantedKeys);
}

/** True if the user holds the owner role. */
export function isOwner(heldKeys: readonly string[]): boolean {
  return heldKeys.includes(OWNER_ROLE_KEY);
}
