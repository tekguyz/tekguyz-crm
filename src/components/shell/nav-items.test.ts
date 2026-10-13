import { describe, expect, it } from "vitest";

import { ALL_NAV, NAV_FOOTER, NAV_GROUPS, navItemFor } from "./nav-items";

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

describe("navItemFor", () => {
  it("returns the destination for a route the nav owns", () => {
    expect(navItemFor("/").label).toBe("Today");
    expect(navItemFor("/settings").label).toBe("Settings");
  });

  it("throws for a path no destination owns, rather than inventing one", () => {
    expect(() => navItemFor("/nowhere")).toThrow();
  });
});
