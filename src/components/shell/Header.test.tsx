import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Header } from "@/components/shell/Header";

// CommandTrigger, HelpTrigger, PageTitle and IdentityMenu are client components
// with their own context, router and portal dependencies; none is under test
// here. Stubbed so this file asserts the header's own order.
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

describe("the Quiet header's order", () => {
  // Shell/IA Variant C: the page title on the left, then Help, search and
  // identity hard right, in that order. Help is a header control, not a row
  // in the avatar menu.
  it("puts the title first and identity last, with Help before search", () => {
    const { container } = render(<Header {...PROPS} />);
    const order = [...container.querySelectorAll("[data-testid]")].map((el) =>
      el.getAttribute("data-testid"),
    );
    expect(order).toEqual(["page-title", "help-trigger", "command-trigger", "identity-menu"]);
  });
});
