import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/core/logger";

/** JSON success response. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

/** JSON error response with a consistent shape. */
export function fail(
  status: number,
  error: string,
  details?: unknown,
): NextResponse {
  return NextResponse.json({ error, details }, { status });
}

export const unauthorized = (): NextResponse => fail(401, "Not authenticated");
export const forbidden = (): NextResponse => fail(403, "Forbidden");
export const notFound = (what = "Resource"): NextResponse =>
  fail(404, `${what} not found`);

/** Parse and validate a JSON request body against a Zod schema. */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<
  { ok: true; data: T } | { ok: false; response: NextResponse }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: fail(400, "Invalid JSON body") };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: fail(400, "Validation failed", result.error.issues),
    };
  }
  return { ok: true, data: result.data };
}

/** Wrap a route handler so unexpected errors become a clean 500. */
export function handler<A extends unknown[]>(
  fn: (request: Request, ...args: A) => Promise<NextResponse>,
) {
  return async (request: Request, ...args: A): Promise<NextResponse> => {
    try {
      return await fn(request, ...args);
    } catch (error) {
      logger.error("Unhandled route error", {
        path: new URL(request.url).pathname,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(500, "Internal server error");
    }
  };
}
