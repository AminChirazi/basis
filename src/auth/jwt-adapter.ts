// Worked example of an AuthAdapter for an external identity
// provider. Basis's default auth is Better Auth (see
// `better-auth.ts`); this adapter is here as the template to copy
// when integrating an external IdP that issues a signed JWT
// (Auth0, Clerk, corporate SSO, an existing auth service). It is
// not wired in by default.
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import type { AuthAdapter, SessionUser } from "@/auth/types";
import { logger } from "@/core/logger";

const COOKIE_NAME = process.env.BASIS_SESSION_COOKIE ?? "basis_session";

function secret(): Uint8Array {
  const value = process.env.BASIS_AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error(
      "BASIS_AUTH_SECRET is missing or too short. Set a strong random value.",
    );
  }
  return new TextEncoder().encode(value);
}

interface SessionClaims {
  sub?: string;
  email?: string;
  name?: string;
  avatarUrl?: string | null;
}

/**
 * Create a signed session token. A deployment calls this from its
 * own sign-in flow and sets the result as the session cookie
 * (name: `BASIS_SESSION_COOKIE`).
 */
export async function createSessionToken(
  user: SessionUser,
  expiresIn: string = "7d",
): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

/** Example adapter: verifies a signed JWT session cookie. */
export const jwtAuthAdapter: AuthAdapter = {
  async getSessionUser(): Promise<SessionUser | null> {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;

    try {
      const { payload } = await jwtVerify(token, secret());
      const claims = payload as SessionClaims;
      if (!claims.sub || !claims.email) return null;
      return {
        id: claims.sub,
        email: claims.email,
        name: claims.name ?? claims.email,
        avatarUrl: claims.avatarUrl ?? null,
      };
    } catch (error) {
      logger.warn("Rejected session token", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },
};
