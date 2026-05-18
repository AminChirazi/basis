import { describe, expect, it } from "vitest";
import {
  hasAnyRole,
  hasRoleOrOwner,
  isOwner,
  OWNER_ROLE_KEY,
} from "@/modules/rbac/roles";

describe("hasAnyRole", () => {
  it("returns true when a wanted role is held", () => {
    expect(hasAnyRole(["admin", "member"], ["admin"])).toBe(true);
  });

  it("returns false when no wanted role is held", () => {
    expect(hasAnyRole(["member"], ["admin"])).toBe(false);
  });

  it("returns false for an empty wanted list", () => {
    expect(hasAnyRole(["owner"], [])).toBe(false);
  });

  it("does not treat owner as implicitly matching other roles", () => {
    expect(hasAnyRole(["owner"], ["admin"])).toBe(false);
  });
});

describe("hasRoleOrOwner", () => {
  it("grants an owner any wanted role", () => {
    expect(hasRoleOrOwner(["owner"], ["admin"])).toBe(true);
  });

  it("grants a non-owner who holds the wanted role", () => {
    expect(hasRoleOrOwner(["admin"], ["admin"])).toBe(true);
  });

  it("denies a non-owner without the wanted role", () => {
    expect(hasRoleOrOwner(["member"], ["admin"])).toBe(false);
  });

  it("grants an owner even with an empty wanted list", () => {
    expect(hasRoleOrOwner([OWNER_ROLE_KEY], [])).toBe(true);
  });

  it("denies a non-owner with an empty wanted list", () => {
    expect(hasRoleOrOwner(["member"], [])).toBe(false);
  });
});

describe("isOwner", () => {
  it("is true when the owner role is held", () => {
    expect(isOwner(["owner", "admin"])).toBe(true);
  });

  it("is false when the owner role is absent", () => {
    expect(isOwner(["admin", "member"])).toBe(false);
  });
});
