import { describe, expect, it } from "vitest";

import robots from "./robots";

describe("robots.txt", () => {
  it("lets crawlers reach the Landing Page and keeps them out of the API", () => {
    expect(robots().rules).toEqual({ userAgent: "*", allow: "/", disallow: "/api/" });
  });
});
