import { describe, expect, it } from "vitest";

import {
  REPORT_PERIODS,
  isWithinRange,
  parseReportPeriod,
  resolvePeriodRange,
} from "@/lib/reports/periods";

// A deliberately non-UTC org. America/Chicago is UTC-5 in September (CDT), so
// the local calendar boundary and the UTC one are five hours apart — which is
// the whole point of the test. A UTC-only implementation passes every
// assertion below except the boundary pair, and that is what the all-time-only
// code path could not express at all.
const CHICAGO = "America/Chicago";
// 2026-09-12T12:00:00Z — mid-September, so "this month" is September 2026.
const NOW = new Date("2026-09-12T12:00:00.000Z");

describe("parseReportPeriod", () => {
  it("defaults to all-time when the searchParam is absent or unknown", () => {
    expect(parseReportPeriod(undefined)).toBe("all");
    expect(parseReportPeriod("last-decade")).toBe("all");
  });

  it("accepts every period it advertises", () => {
    for (const period of REPORT_PERIODS) {
      expect(parseReportPeriod(period)).toBe(period);
    }
  });
});

describe("resolvePeriodRange", () => {
  it("returns null for all-time, so no date filter is applied at all", () => {
    expect(resolvePeriodRange("all", CHICAGO, NOW)).toBeNull();
  });

  it("uses the ORG's calendar month, not UTC's", () => {
    const range = resolvePeriodRange("this-month", CHICAGO, NOW);

    // 2026-09-01T00:00 in Chicago (CDT, UTC-5) is 05:00 UTC — not 00:00 UTC.
    expect(range).toEqual({
      startISO: "2026-09-01T05:00:00.000Z",
      endISO: "2026-10-01T05:00:00.000Z",
    });
  });

  it("resolves last month against the same org calendar", () => {
    expect(resolvePeriodRange("last-month", CHICAGO, NOW)).toEqual({
      startISO: "2026-08-01T05:00:00.000Z",
      endISO: "2026-09-01T05:00:00.000Z",
    });
  });

  it("crosses a DST change without drifting", () => {
    // Chicago is UTC-6 (CST) in January and UTC-5 (CDT) in December's start.
    // The year boundary must be taken at the offset in force on that date.
    expect(resolvePeriodRange("this-year", CHICAGO, NOW)).toEqual({
      startISO: "2026-01-01T06:00:00.000Z",
      endISO: "2027-01-01T06:00:00.000Z",
    });
  });

  it("rolls the month over the year boundary", () => {
    const january = new Date("2026-01-15T12:00:00.000Z");
    expect(resolvePeriodRange("last-month", "UTC", january)).toEqual({
      startISO: "2025-12-01T00:00:00.000Z",
      endISO: "2026-01-01T00:00:00.000Z",
    });
  });
});

describe("isWithinRange", () => {
  const september = resolvePeriodRange("this-month", CHICAGO, NOW);

  it("EXCLUDES a lead closed one second before the org's month starts", () => {
    // 2026-08-31T23:59:59 in Chicago. Under a UTC boundary this instant reads
    // as 2026-09-01, so it would be counted into September — wrongly.
    expect(isWithinRange("2026-09-01T04:59:59.000Z", september)).toBe(false);
  });

  it("INCLUDES a lead closed exactly on the org's month boundary", () => {
    // 2026-09-01T00:00:00 in Chicago. The start is inclusive.
    expect(isWithinRange("2026-09-01T05:00:00.000Z", september)).toBe(true);
  });

  it("EXCLUDES a lead closed exactly on the org's next-month boundary", () => {
    // The end is exclusive, so October's first lead belongs to October only —
    // this is what keeps two adjacent periods from double-counting one lead.
    expect(isWithinRange("2026-10-01T05:00:00.000Z", september)).toBe(false);
  });

  it("treats a null timestamp as outside any real period", () => {
    // An unclosed lead has no closed_at. It is open pipeline, bucketed by
    // created_at instead; it must never fall into a closed-lead period.
    expect(isWithinRange(null, september)).toBe(false);
  });

  it("includes everything when the range is all-time", () => {
    expect(isWithinRange("1999-01-01T00:00:00.000Z", null)).toBe(true);
    expect(isWithinRange(null, null)).toBe(true);
  });
});
