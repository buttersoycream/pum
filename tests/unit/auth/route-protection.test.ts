import { describe, it, expect } from "vitest";
import { isProtectedPath, isAuthPath } from "@/lib/auth/route-protection";

describe("isProtectedPath", () => {
  it("protects dashboard and its subpaths", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/dashboard/settings")).toBe(true);
  });

  it("protects the couple area including invite", () => {
    expect(isProtectedPath("/couple")).toBe(true);
    expect(isProtectedPath("/couple/invite")).toBe(true);
  });

  it("leaves the public invite-accept page unprotected", () => {
    expect(isProtectedPath("/couple/accept/anytoken")).toBe(false);
    expect(isProtectedPath("/couple/accept")).toBe(false);
  });

  it("does not protect public or auth routes", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/signup")).toBe(false);
  });

  it("protects /home, /articles, and /me (magazine routes)", () => {
    expect(isProtectedPath("/home")).toBe(true);
    expect(isProtectedPath("/articles")).toBe(true);
    expect(isProtectedPath("/me")).toBe(true);
    expect(isProtectedPath("/home/x")).toBe(true);
  });
});

describe("isAuthPath", () => {
  it("matches login and signup and their subpaths", () => {
    expect(isAuthPath("/login")).toBe(true);
    expect(isAuthPath("/signup")).toBe(true);
    expect(isAuthPath("/login/whatever")).toBe(true);
  });

  it("does not match other routes", () => {
    expect(isAuthPath("/dashboard")).toBe(false);
    expect(isAuthPath("/")).toBe(false);
  });
});
