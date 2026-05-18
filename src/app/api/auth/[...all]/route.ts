import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/auth/better-auth";

// Mounts every Better Auth endpoint under /api/auth/*:sign-up,
// sign-in, sign-out, session, and the rest.
export const { GET, POST } = toNextJsHandler(auth);
