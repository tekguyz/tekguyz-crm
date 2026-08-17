import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { OptionRow } from "./OptionRow";

// jsdom implements no layout, so `scrollIntoView` does not exist on Element and
// a selected row's effect would throw before any assertion ran. The scroll
// behaviour is not what these tests are about — the markup contract is.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

describe("OptionRow", () => {
  it("renders a non-focusable listbox option", () => {
    render(<OptionRow>Amanda Chu</OptionRow>);
    const row = screen.getByRole("option");
    expect(row).toBeInTheDocument();
    expect(row).not.toHaveAttribute("tabindex");
  });

  it("reports its selected state to assistive tech", () => {
    const { unmount } = render(<OptionRow selected>Amanda Chu</OptionRow>);
    expect(screen.getByRole("option")).toHaveAttribute("aria-selected", "true");
    unmount();

    render(<OptionRow>Amanda Chu</OptionRow>);
    expect(screen.getByRole("option")).toHaveAttribute("aria-selected", "false");
  });

  // Colour alone is not the selected signal. The row is deliberately not
  // focusable, so the global `:focus-visible` outline can never reach it, and
  // `bg-canvas-soft` on `bg-canvas-pure` is a near-invisible tint on its own.
  // The leading --accent bar is the non-colour signal; it uses NavItem's exact
  // `MARKERS.row` geometry so the app keeps one idiom for "this is the one".
  it("paints a leading accent marker bar only when selected", () => {
    const { unmount } = render(<OptionRow selected>Amanda Chu</OptionRow>);
    const selected = screen.getByRole("option");
    expect(selected.className).toContain("before:bg-accent");
    expect(selected.className).toContain("before:left-0");
    expect(selected.className).toContain("before:w-0.5");
    expect(selected.className).toContain("before:h-4");
    unmount();

    render(<OptionRow>Amanda Chu</OptionRow>);
    expect(screen.getByRole("option").className).not.toContain("before:bg-accent");
  });

  // `relative` is what the pseudo-element anchors to, so it must be present
  // regardless of state — dropping it into the `selected` branch would work by
  // accident today and break the moment the branch is restructured.
  it("always establishes the positioning context the marker needs", () => {
    const { unmount } = render(<OptionRow>Amanda Chu</OptionRow>);
    expect(screen.getByRole("option")).toHaveClass("relative");
    unmount();

    render(<OptionRow selected>Amanda Chu</OptionRow>);
    expect(screen.getByRole("option")).toHaveClass("relative");
  });

  it("keeps the tint as a reinforcing signal alongside the bar", () => {
    render(<OptionRow selected>Amanda Chu</OptionRow>);
    expect(screen.getByRole("option")).toHaveClass("bg-canvas-soft");
  });
});
