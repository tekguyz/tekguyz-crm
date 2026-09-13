import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Header } from "@/components/shell/Header";

// CommandTrigger, HelpTrigger, PageTitle and IdentityMenu are client components
// with their own context, router and portal dependencies; none is under test
// here. Stubbed so this file asserts one thing: does the header show the
// read-only signal, and only for the demo tenant.
vi.mock("@/components/shell/CommandTrigger", () => ({
  CommandTrigger: () => <div data-testid="command-trigger" />,
}));
vi.mock("@/components/shell/HelpTrigger", () => ({
  HelpTrigger: () => <div data-testid="help-trigger" />,
}));
vi.mock("@/components/shell/PageTitle", () => ({
  PageTitle: () => <p data-testid="page-title">Today</p>,
}));
vi.mock("@/components/shell/IdentityMenu", () => ({
  IdentityMenu: () => <div data-testid="identity-menu" />,
}));

const PROPS = { userEmail: "someone@example.com", displayName: null };

describe("the demo read-only badge", () => {
  it("is absent for a real tenant", () => {
    render(<Header {...PROPS} isDemo={false} />);
    expect(screen.queryByText("Read-only")).toBeNull();
  });

  it("is shown for the demo tenant", () => {
    render(<Header {...PROPS} isDemo />);
    expect(screen.getByText("Read-only")).toBeInTheDocument();
  });

  it("says read-only, not just the word Demo", () => {
    // The sidebar already says "TEKGUYZ Demo". A badge that repeats it tells a
    // visitor nothing new, and the one fact they cannot get anywhere else is
    // that writes are refused. If this ever regresses to "Demo", the badge has
    // stopped earning its place in the header.
    render(<Header {...PROPS} isDemo />);
    expect(screen.getByText("Read-only").textContent).toBe("Read-only");
  });

  it("does not use the orange pill, which the Overdue badge owns", () => {
    // Shipped orange first. On the Today view that put it in the same colour
    // as the SLA "Overdue" pills a few pixels below — one colour, two
    // unrelated meanings, and the other is a real alert.
    const { container } = render(<Header {...PROPS} isDemo />);
    const badge = container.querySelector("span.text-label");
    expect(badge?.className).not.toMatch(/pill-orange/);
    expect(badge?.className).toMatch(/bg-canvas-soft/);
  });
});

describe("the Quiet header's order", () => {
  // Shell/IA Variant C: the page title on the left, then Help, search and
  // identity hard right, in that order. Help is a header control, not a row
  // in the avatar menu.
  it("puts the title first and identity last, with Help before search", () => {
    const { container } = render(<Header {...PROPS} isDemo={false} />);
    const order = [...container.querySelectorAll("[data-testid]")].map((el) =>
      el.getAttribute("data-testid"),
    );
    expect(order).toEqual(["page-title", "help-trigger", "command-trigger", "identity-menu"]);
  });
});
