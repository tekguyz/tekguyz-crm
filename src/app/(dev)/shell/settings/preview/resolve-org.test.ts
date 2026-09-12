import { describe, expect, it } from "vitest";

import { MOCK_ORG, MOCK_ORG_LONG } from "./mock-org";
import { resolveOrgFixture } from "./resolve-org";

// Pure logic, so this is a *.test.ts and lands in the `node` vitest project.
// All three Settings variant pages read `?long=1` through this one function;
// if they disagreed, the width check would measure three different things
// while reporting one result.

describe("resolveOrgFixture", () => {
  it("defaults to the ordinary fixture", () => {
    expect(resolveOrgFixture({})).toEqual(MOCK_ORG);
  });

  it("gives the longest values for ?long=1", () => {
    expect(resolveOrgFixture({ long: "1" })).toEqual(MOCK_ORG_LONG);
  });

  it("gives the width check something to squeeze", () => {
    expect(MOCK_ORG_LONG.name.length).toBeGreaterThan(MOCK_ORG.name.length);
    expect(MOCK_ORG_LONG.timezone.length).toBeGreaterThan(MOCK_ORG.timezone.length);
  });
});
