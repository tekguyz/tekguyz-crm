import { describe, expect, it } from "vitest";

import { EMPTY_LOGIN, LOGIN_ERROR, LOGIN_MESSAGE, LONG_EMAIL, LONG_ERROR } from "./mock-login";
import { resolveLoginFixture } from "./resolve-login";

describe("resolveLoginFixture", () => {
  it("is empty with no query", () => {
    expect(resolveLoginFixture({})).toEqual(EMPTY_LOGIN);
  });

  it("maps each state to its one banner", () => {
    expect(resolveLoginFixture({ state: "error" })).toMatchObject({ error: LOGIN_ERROR, message: null });
    expect(resolveLoginFixture({ state: "message" })).toMatchObject({ error: null, message: LOGIN_MESSAGE });
  });

  it("lets long=1 win, so the width check always measures the worst case", () => {
    expect(resolveLoginFixture({ long: "1", state: "message" })).toEqual({
      email: LONG_EMAIL,
      error: LONG_ERROR,
      message: null,
    });
  });

  it("ignores an unknown state", () => {
    expect(resolveLoginFixture({ state: "nope" })).toEqual(EMPTY_LOGIN);
  });
});
