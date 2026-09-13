import { describe, expect, it } from "vitest";

import { ALL_NAV, NAV_FOOTER, NAV_GROUPS, pageTitleFor } from "./nav-items";

describe("nav-items — the Quiet sidebar arrangement", () => {
  it("holds every destination exactly once across the groups and the footer", () => {
    const arranged = [...NAV_GROUPS.flatMap((g) => g.items), ...NAV_FOOTER].map((i) => i.href);

    expect([...arranged].sort()).toEqual(ALL_NAV.map((i) => i.href).sort());
    expect(new Set(arranged).size).toBe(arranged.length);
  });

  it("keeps Settings in the sidebar footer rather than dropping it", () => {
    expect(NAV_FOOTER.map((i) => i.href)).toContain("/settings");
  });
});

describe("pageTitleFor", () => {
  it("returns the nav label for an exact route", () => {
    expect(pageTitleFor("/")).toBe("Today");
    expect(pageTitleFor("/pipeline")).toBe("Pipeline");
    expect(pageTitleFor("/settings")).toBe("Settings");
  });

  it("uses the parent destination for a nested route, never Today", () => {
    expect(pageTitleFor("/prospects/import")).toBe("Prospects");
  });

  it("returns null for a path no destination owns", () => {
    expect(pageTitleFor("/nowhere")).toBeNull();
  });
});
