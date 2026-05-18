import { headers } from "next/headers";
import { auth } from "@/auth/better-auth";
import type { AuthAdapter, SessionUser } from "@/auth/types";

/**
 * The default auth adapter: resolves the current user from a
 * Better Auth session.
 */
export const betterAuthAdapter: AuthAdapter = {
  async getSessionUser(): Promise<SessionUser | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      avatarUrl: session.user.image ?? null,
    };
  },
};
