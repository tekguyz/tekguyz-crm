import { describe, expect, it } from "vitest";

import { dueForPreset } from "@/lib/leads/due-presets";

// Built from local parts, never an ISO string, so the suite means the same
// thing in any machine timezone.
const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min, 0, 0);

describe("dueForPreset", () => {
  it("puts Today at 5 PM while 5 PM is still ahead", () => {
    expect(dueForPreset("today", at(2026, 10, 12, 10, 30))).toEqual(at(2026, 10, 12, 17));
  });

  it("puts Today at 11:59 PM once 5 PM has passed", () => {
    expect(dueForPreset("today", at(2026, 10, 12, 18, 15))).toEqual(at(2026, 10, 12, 23, 59));
  });

  it("puts the future presets at 9 AM on the right day", () => {
    const now = at(2026, 10, 12, 14);
    expect(dueForPreset("tomorrow", now)).toEqual(at(2026, 10, 13, 9));
    expect(dueForPreset("in3days", now)).toEqual(at(2026, 10, 15, 9));
    expect(dueForPreset("inWeek", now)).toEqual(at(2026, 10, 19, 9));
  });

  it("rolls over a month end", () => {
    expect(dueForPreset("inWeek", at(2026, 10, 28, 8))).toEqual(at(2026, 11, 4, 9));
  });
});
