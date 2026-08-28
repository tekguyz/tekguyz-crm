import { describe, expect, it } from "vitest";

import { TIMEZONES, timezoneLabel } from "@/lib/organizations/org-options";

describe("timezoneLabel", () => {
  it("humanizes a two-segment IANA id", () => {
    expect(timezoneLabel("America/New_York")).toBe("New York");
  });

  it("humanizes a three-segment IANA id", () => {
    expect(timezoneLabel("America/Argentina/Buenos_Aires")).toBe("Buenos Aires");
  });

  it("returns a single-segment id unchanged", () => {
    expect(timezoneLabel("UTC")).toBe("UTC");
  });

  // The defect this shipped to fix: the <select> rendered the raw id, so an
  // operator read "America/New_York" in a settings form.
  it("leaves no underscore or slash in any label the select renders", () => {
    const labels = TIMEZONES.map(timezoneLabel);
    expect(labels.filter((label) => label.includes("_") || label.includes("/"))).toEqual([]);
  });

  // Dropping the region is only safe while every city name is unique. If that
  // stops being true, timezoneLabel has to carry the region again.
  it("produces a distinct label for every zone in the list", () => {
    const labels = TIMEZONES.map(timezoneLabel);
    expect(new Set(labels).size).toBe(TIMEZONES.length);
  });
});
