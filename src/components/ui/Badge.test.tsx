import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("defaults to the neutral tone", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toHaveClass(
      "bg-canvas-soft",
      "text-ink-muted",
    );
  });

  it("maps each decorative tone to its pill token pair", () => {
    const cases = [
      ["purple", "bg-pill-purple-bg", "text-pill-purple-fg"],
      ["pink", "bg-pill-pink-bg", "text-pill-pink-fg"],
      ["orange", "bg-pill-orange-bg", "text-pill-orange-fg"],
      ["teal", "bg-pill-teal-bg", "text-pill-teal-fg"],
      ["green", "bg-pill-green-bg", "text-pill-green-fg"],
      ["sky", "bg-pill-sky-bg", "text-pill-sky-fg"],
    ] as const;

    for (const [tone, bg, fg] of cases) {
      const { unmount } = render(<Badge tone={tone}>Tag</Badge>);
      expect(screen.getByText("Tag")).toHaveClass(bg, fg);
      unmount();
    }
  });

  it("uses the cold token for the overdue tone", () => {
    render(<Badge tone="cold">Overdue</Badge>);
    expect(screen.getByText("Overdue")).toHaveClass("text-cold");
  });

  it("renders no dot by default", () => {
    const { container } = render(<Badge>New</Badge>);
    expect(container.querySelector("[aria-hidden='true']")).toBeNull();
  });

  it("renders a decorative dot when asked", () => {
    const { container } = render(<Badge dot>New</Badge>);
    expect(container.querySelector("[aria-hidden='true']")).toBeTruthy();
  });

  it("merges a caller className", () => {
    render(<Badge className="uppercase">New</Badge>);
    expect(screen.getByText("New")).toHaveClass("uppercase");
  });
});
