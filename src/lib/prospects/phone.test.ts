import { describe, expect, it } from "vitest";
import { normalizePhoneDigits } from "@/lib/prospects/phone";

// The whole point of the prospects duplicate hint is that a raw string
// comparison misses matches on formatting alone. These cases are the ones the
// leadgen CSVs and the leads table actually produce side by side.
describe("normalizePhoneDigits", () => {
  it("treats every formatting of the same US number as equal", () => {
    const forms = [
      "(954) 555-1234",
      "954-555-1234",
      "954.555.1234",
      "9545551234",
      "+1 954 555 1234",
      "1-954-555-1234",
      "  (954) 555 1234  ",
    ];
    for (const form of forms) {
      expect(normalizePhoneDigits(form), form).toBe("9545551234");
    }
  });

  it("returns null for anything with fewer than ten digits", () => {
    // A 7-digit local number would otherwise false-match every number ending
    // in those seven digits — the exact false positive this guard exists for.
    expect(normalizePhoneDigits("555-1234")).toBeNull();
    expect(normalizePhoneDigits("ext. 402")).toBeNull();
    expect(normalizePhoneDigits("")).toBeNull();
    expect(normalizePhoneDigits(null)).toBeNull();
    expect(normalizePhoneDigits(undefined)).toBeNull();
  });

  it("does not confuse two different numbers that share a suffix", () => {
    expect(normalizePhoneDigits("(954) 555-1234")).not.toBe(
      normalizePhoneDigits("(817) 555-1234"),
    );
  });
});
