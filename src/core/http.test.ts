import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  fail,
  forbidden,
  handler,
  notFound,
  ok,
  parseBody,
  unauthorized,
} from "@/core/http";

describe("response helpers", () => {
  it("ok returns the data with status 200", async () => {
    const res = ok({ hello: "world" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hello: "world" });
  });

  it("fail returns the error shape and status", async () => {
    const res = fail(418, "teapot");
    expect(res.status).toBe(418);
    expect(await res.json()).toEqual({ error: "teapot" });
  });

  it("maps the standard errors to their status codes", () => {
    expect(unauthorized().status).toBe(401);
    expect(forbidden().status).toBe(403);
    expect(notFound("Invoice").status).toBe(404);
  });
});

describe("parseBody", () => {
  const schema = z.object({ name: z.string() });

  function jsonRequest(body: string) {
    return new Request("http://test/x", {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
    });
  }

  it("accepts a valid body", async () => {
    const result = await parseBody(
      jsonRequest(JSON.stringify({ name: "a" })),
      schema,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.name).toBe("a");
  });

  it("rejects invalid JSON with 400", async () => {
    const result = await parseBody(jsonRequest("not json"), schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("rejects a schema violation with 400", async () => {
    const result = await parseBody(
      jsonRequest(JSON.stringify({ name: 5 })),
      schema,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});

describe("handler", () => {
  it("turns a thrown error into a clean 500", async () => {
    const wrapped = handler(async () => {
      throw new Error("kaboom");
    });
    const res = await wrapped(new Request("http://test/x"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});
