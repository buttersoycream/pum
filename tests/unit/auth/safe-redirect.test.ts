import { describe, it, expect } from "vitest";
import { safeInternalPath } from "@/lib/auth/safe-redirect";

describe("safeInternalPath", () => {
  it("returns an internal rooted path unchanged", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/couple/accept/abc-123")).toBe(
      "/couple/accept/abc-123",
    );
    expect(safeInternalPath("/couple/accept/abc?x=1")).toBe(
      "/couple/accept/abc?x=1",
    );
  });

  it("returns null for empty or nullish input", () => {
    expect(safeInternalPath("")).toBeNull();
    expect(safeInternalPath(null)).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
  });

  it("rejects absolute URLs", () => {
    expect(safeInternalPath("https://evil.com")).toBeNull();
    expect(safeInternalPath("http://evil.com/x")).toBeNull();
  });

  it("rejects protocol-relative and backslash tricks", () => {
    expect(safeInternalPath("//evil.com")).toBeNull();
    expect(safeInternalPath("/\\evil.com")).toBeNull();
    expect(safeInternalPath("\\\\evil.com")).toBeNull();
  });

  it("rejects scheme strings and non-rooted paths", () => {
    expect(safeInternalPath("javascript:alert(1)")).toBeNull();
    expect(safeInternalPath("foo/bar")).toBeNull();
  });

  it("rejects control characters and surrounding whitespace", () => {
    expect(safeInternalPath("/foo\nbar")).toBeNull();
    expect(safeInternalPath(" /foo")).toBeNull();
  });
});
