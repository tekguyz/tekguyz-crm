import { describe, expect, it } from "vitest";
import { describeDue } from "./format";

const TZ = "America/New_York";
// 2026-10-05 12:00 in New York (EDT, UTC-4).
const NOW = new Date("2026-10-05T16:00:00Z");

describe("describeDue", () => {
  it("says how late an overdue date is, in days", () => {
    expect(describeDue("2026-10-02T12:04:00Z", TZ, NOW)).toEqual({
      label: "3d overdue",
      overdue: true,
    });
  });

  it("calls an overdue date earlier today overdue, with its time", () => {
    expect(describeDue("2026-10-05T13:00:00Z", TZ, NOW)).toEqual({
      label: "Overdue · 9:00 AM",
      overdue: true,
    });
  });

  it("calls a later time today 'Today'", () => {
    expect(describeDue("2026-10-05T19:30:00Z", TZ, NOW)).toEqual({
      label: "Today · 3:30 PM",
      overdue: false,
    });
  });

  it("calls the next calendar day in the org's zone 'Tomorrow'", () => {
    // 01:00 UTC on the 6th is still the 5th in New York — so Today, not Tomorrow.
    expect(describeDue("2026-10-06T01:00:00Z", TZ, NOW).label).toBe("Today · 9:00 PM");
    expect(describeDue("2026-10-06T14:00:00Z", TZ, NOW).label).toBe("Tomorrow · 10:00 AM");
  });

  it("shows a plain date further out", () => {
    expect(describeDue("2026-10-12T14:00:00Z", TZ, NOW)).toEqual({
      label: "Oct 12",
      overdue: false,
    });
  });

  it("counts overdue days by the org's calendar, not 24-hour blocks", () => {
    // 23:00 New York on the 4th: one calendar day late, though only 13 hours.
    expect(describeDue("2026-10-05T03:00:00Z", TZ, NOW).label).toBe("1d overdue");
  });
});
