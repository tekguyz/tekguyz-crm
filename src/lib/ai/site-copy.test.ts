// @vitest-environment node
import { describe, expect, it } from "vitest";
import { stripSiteCopy } from "@/lib/ai/site-copy";

describe("stripSiteCopy", () => {
  it("empties a field placeholder sent whole", () => {
    expect(stripSiteCopy("you@company.com")).toBe("");
    expect(stripSiteCopy("  Select one ")).toBe("");
  });

  it("keeps a short placeholder inside a real sentence", () => {
    const s = "We have three vendors and need to select one by Friday.";
    expect(stripSiteCopy(s)).toBe(s);
  });

  it("removes a long placeholder with curly quotes and no final period", () => {
    expect(stripSiteCopy("Tell us what you\u2019re trying to fix or build")).toBe("");
  });

  it("keeps what the visitor wrote around the copy", () => {
    const out = stripSiteCopy("We lose calls at night. Tell us what you're trying to fix or build.");
    expect(out).toBe("We lose calls at night.");
  });

  it("returns blank for blank", () => {
    expect(stripSiteCopy("")).toBe("");
  });
});
