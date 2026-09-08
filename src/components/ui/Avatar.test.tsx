import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar, avatarToneFor, getInitials, hashString } from "./Avatar";

describe("getInitials", () => {
  it("takes two initials from a two-word name", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL");
  });

  it("takes one initial from a single word", () => {
    expect(getInitials("Northwind")).toBe("N");
  });

  it("uses the first and last word when there are more than two", () => {
    expect(getInitials("Ada Byron King Lovelace")).toBe("AL");
  });

  it("falls back to ? for an empty or whitespace-only name", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials("   \t ")).toBe("?");
  });

  it("ignores extra whitespace between words", () => {
    expect(getInitials("  ada   lovelace  ")).toBe("AL");
  });
});

describe("avatarToneFor", () => {
  it("returns the same tone for the same name every time", () => {
    const first = avatarToneFor("Ada Lovelace");
    for (let i = 0; i < 50; i += 1) {
      expect(avatarToneFor("Ada Lovelace")).toBe(first);
    }
  });

  it("ignores case and surrounding whitespace", () => {
    expect(avatarToneFor("  ADA LOVELACE ")).toBe(avatarToneFor("ada lovelace"));
  });

  it("ignores whitespace BETWEEN words, not just around them", () => {
    // Regression: trimming alone left "ada   lovelace" != "ada lovelace", so
    // one person rendered as AL-on-orange next to AL-on-green on /design while
    // every unit test stayed green. getInitials already collapses these, so the
    // colour has to as well.
    expect(avatarToneFor("  ada   lovelace  ")).toBe(avatarToneFor("Ada Lovelace"));
    expect(avatarToneFor("Ada	Lovelace")).toBe(avatarToneFor("Ada Lovelace"));
  });

  it("agrees with getInitials on what counts as the same name", () => {
    const variants = ["Ada Lovelace", "  ada   lovelace  ", "ADA	LOVELACE"];
    const initials = new Set(variants.map(getInitials));
    const tones = new Set(variants.map(avatarToneFor));
    expect(initials.size).toBe(1);
    expect(tones.size).toBe(1);
  });

  it("spreads a set of names across more than one palette colour", () => {
    const names = [
      "Ada Lovelace",
      "Grace Hopper",
      "Alan Turing",
      "Katherine Johnson",
      "Barbara Liskov",
      "Edsger Dijkstra",
      "Northwind Traders",
      "Contoso Ltd",
      "Fabrikam Inc",
      "Tailspin Toys",
    ];
    const tones = new Set(names.map(avatarToneFor));
    expect(tones.size).toBeGreaterThan(1);
  });

  it("only ever returns a decorative pill hue", () => {
    const allowed = ["purple", "pink", "orange", "teal", "green", "sky"];
    for (let i = 0; i < 200; i += 1) {
      expect(allowed).toContain(avatarToneFor(`name-${i}`));
    }
  });
});

describe("hashString", () => {
  it("stays an unsigned 32-bit integer for a long input", () => {
    const hash = hashString("x".repeat(500));
    expect(Number.isSafeInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(2 ** 32);
  });
});

describe("Avatar", () => {
  it("renders the initials", () => {
    render(<Avatar name="Ada Lovelace" />);
    expect(screen.getByText("AL")).toBeTruthy();
  });

  it("paints the same pill token pair on every render of one name", () => {
    const { unmount } = render(<Avatar name="Grace Hopper" />);
    const first = screen.getByText("GH").className;
    unmount();

    render(<Avatar name="Grace Hopper" />);
    expect(screen.getByText("GH").className).toBe(first);
  });

  it("uses a matched pill bg/fg pair, never --accent", () => {
    render(<Avatar name="Alan Turing" />);
    const cls = screen.getByText("AT").className;
    expect(cls).toMatch(/bg-pill-(purple|pink|orange|teal|green|sky)-bg/);
    expect(cls).toMatch(/text-pill-(purple|pink|orange|teal|green|sky)-fg/);
    expect(cls).not.toMatch(/accent/);
  });

  it("defaults to the default size and honours sm and lg", () => {
    const { unmount } = render(<Avatar name="Ada Lovelace" />);
    expect(screen.getByText("AL")).toHaveClass("size-8");
    unmount();

    const small = render(<Avatar name="Ada Lovelace" size="sm" />);
    expect(screen.getByText("AL")).toHaveClass("size-6");
    small.unmount();

    render(<Avatar name="Ada Lovelace" size="lg" />);
    expect(screen.getByText("AL")).toHaveClass("size-10");
  });

  it("carries the full name as a title and hides itself from the a11y tree", () => {
    const { container } = render(<Avatar name="Ada Lovelace" />);
    const el = container.querySelector("[data-slot='avatar']");
    expect(el?.getAttribute("title")).toBe("Ada Lovelace");
    expect(el?.getAttribute("aria-hidden")).toBe("true");
  });

  it("merges a caller className", () => {
    render(<Avatar name="Ada Lovelace" className="ring-2" />);
    expect(screen.getByText("AL")).toHaveClass("ring-2");
  });
});
