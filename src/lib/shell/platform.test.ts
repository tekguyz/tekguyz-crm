import { describe, expect, it } from "vitest";

import { isApplePlatform, shortcutLabel } from "./platform";

describe("isApplePlatform", () => {
  it("trusts the client hint first", () => {
    expect(isApplePlatform('"macOS"', null)).toBe(true);
    expect(isApplePlatform('"iOS"', null)).toBe(true);
    expect(isApplePlatform('"Windows"', "Macintosh")).toBe(false);
  });

  it("falls back to the user agent", () => {
    expect(isApplePlatform(null, "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe(true);
    expect(isApplePlatform(null, "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
    expect(isApplePlatform(null, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
  });

  it("defaults to not Apple when it cannot tell", () => {
    expect(isApplePlatform(null, null)).toBe(false);
    expect(isApplePlatform("", "")).toBe(false);
  });
});

describe("shortcutLabel", () => {
  it("names the key the person actually has", () => {
    expect(shortcutLabel(true)).toBe("⌘K");
    expect(shortcutLabel(false)).toBe("Ctrl K");
  });
});
