import { describe, expect, it } from "vitest";

import {
  SIDEBAR_COOKIE_NAME,
  parseSidebarState,
  writeSidebarCookie,
} from "./sidebar-cookie";

// The no-flash guarantee rests entirely on this cookie being readable by the
// server layout, so both halves of the round trip are worth pinning: what an
// unset or junk value means, and what actually gets written.
describe("sidebar cookie", () => {
  it("defaults to expanded when unset", () => {
    expect(parseSidebarState(undefined)).toBe("expanded");
  });

  it("defaults to expanded for an unrecognised value", () => {
    expect(parseSidebarState("banana")).toBe("expanded");
  });

  it("reads the collapsed state", () => {
    expect(parseSidebarState("collapsed")).toBe("collapsed");
  });

  it("writes a root-scoped, long-lived cookie", () => {
    writeSidebarCookie("collapsed");
    expect(document.cookie).toContain(`${SIDEBAR_COOKIE_NAME}=collapsed`);
  });

  it("round-trips what it writes", () => {
    writeSidebarCookie("expanded");
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${SIDEBAR_COOKIE_NAME}=`))
      ?.split("=")[1];
    expect(parseSidebarState(raw)).toBe("expanded");
  });
});
