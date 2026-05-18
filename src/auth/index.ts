import type { AuthAdapter, SessionUser } from "@/auth/types";
import { jwtAuthAdapter } from "@/auth/jwt-adapter";

/**
 * The active auth adapter for this deployment.
 *
 * Swap this for a custom `AuthAdapter` to integrate an existing
 * identity provider. The default verifies a signed JWT session
 * cookie (see `jwt-adapter.ts`).
 */
export const authAdapter: AuthAdapter = jwtAuthAdapter;

/** Resolve the signed-in user for the current request, or null. */
export function getCurrentUser(): Promise<SessionUser | null> {
  return authAdapter.getSessionUser();
}

export type { AuthAdapter, SessionUser };
