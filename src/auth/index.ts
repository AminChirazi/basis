import type { AuthAdapter, SessionUser } from "@/auth/types";
import { betterAuthAdapter } from "@/auth/better-auth-adapter";

/**
 * The active auth adapter for this deployment.
 *
 * The default is Better Auth, self-hosted in this app (see
 * `better-auth.ts`). To integrate a hosted provider or corporate
 * SSO, implement a custom `AuthAdapter` and assign it here; the
 * bundled `jwt-adapter.ts` is a worked example for an external
 * identity provider.
 */
export const authAdapter: AuthAdapter = betterAuthAdapter;

/** Resolve the signed-in user for the current request, or null. */
export function getCurrentUser(): Promise<SessionUser | null> {
  return authAdapter.getSessionUser();
}

export type { AuthAdapter, SessionUser };
