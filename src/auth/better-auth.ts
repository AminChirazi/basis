import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/core/db";

/**
 * Better Auth instance: the default, self-hosted authentication
 * for Basis.
 *
 * It runs inside this app against the same Postgres database, so
 * there is no external auth vendor and no lock-in. The sign-up and
 * sign-in endpoints are mounted automatically by the catch-all
 * route at `/api/auth/*`.
 *
 * To use a hosted provider instead (Auth0, Clerk, corporate SSO),
 * implement the `AuthAdapter` interface rather than changing this.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
});
