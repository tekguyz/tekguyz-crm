import { describe, expect, it } from "vitest";

import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("keeps a same-origin path with its query and hash", () => {
    expect(safeNextPath("/reports")).toBe("/reports");
    expect(safeNextPath("/reports?period=month#won")).toBe("/reports?period=month#won");
  });

  it("falls back to / when there is nothing usable", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("reports")).toBe("/");
  });

  it("refuses every way off this origin", () => {
    for (const hostile of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "javascript:alert(1)",
      "http://[",
    ]) {
      expect(safeNextPath(hostile), hostile).toBe("/");
    }
  });

  it("ignores a File entry, which FormData can also hold", () => {
    expect(safeNextPath(new File(["x"], "next.txt"))).toBe("/");
  });
});
