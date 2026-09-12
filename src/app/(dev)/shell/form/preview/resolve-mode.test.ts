import { describe, expect, it } from "vitest";

import {
  EMPTY_LEAD_FORM,
  MOCK_LEAD_FORM,
  MOCK_LEAD_FORM_LONG,
} from "./mock-form";
import { resolveFormFixture } from "./resolve-mode";

// Pure logic, so this is a *.test.ts and lands in the `node` vitest project
// with no jsdom cost. It exists because all three variant pages read the query
// string through this one function: if they ever disagreed about `?long=1`,
// the width check would be measuring three different things while reporting
// one result.

describe("resolveFormFixture", () => {
  it("defaults to edit with values in it", () => {
    expect(resolveFormFixture({})).toEqual({ mode: "edit", initial: MOCK_LEAD_FORM });
  });

  it("gives an empty form for ?mode=create", () => {
    expect(resolveFormFixture({ mode: "create" })).toEqual({
      mode: "create",
      initial: EMPTY_LEAD_FORM,
    });
  });

  it("gives the longest values for ?long=1", () => {
    expect(resolveFormFixture({ long: "1" })).toEqual({
      mode: "edit",
      initial: MOCK_LEAD_FORM_LONG,
    });
  });

  it("lets ?long=1 win over ?mode=create", () => {
    // The width check appends ?long=1 and nothing else, but a reviewer may
    // arrive with both in the URL. An empty form has nothing to squeeze, so
    // the stress fixture has to win or the check would quietly measure blanks.
    expect(resolveFormFixture({ mode: "create", long: "1" }).initial).toEqual(
      MOCK_LEAD_FORM_LONG,
    );
  });
});
