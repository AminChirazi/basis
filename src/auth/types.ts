/** The minimal identity an auth adapter must resolve. */
export interface SessionUser {
  /** Stable, unique id for the signed-in user. */
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Pluggable authentication.
 *
 * Basis ships a default JWT cookie adapter. To plug into an
 * existing identity provider (SSO, an internal auth service, a
 * SaaS auth vendor), implement this interface and set it as the
 * active adapter in `src/auth/index.ts`. Nothing else in the
 * codebase depends on how a session is established.
 */
export interface AuthAdapter {
  /** Resolve the user from the incoming request, or null. */
  getSessionUser(): Promise<SessionUser | null>;
}
