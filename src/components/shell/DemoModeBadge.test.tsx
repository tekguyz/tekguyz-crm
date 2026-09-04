import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Header } from "@/components/shell/Header";

// CommandTrigger and IdentityMenu are client components with their own context
// and portal dependencies; neither is under test here. Stubbed so this file
// asserts one thing: does the header show the read-only signal, and only for
// the demo tenant.
vi.mock("@/components/shell/CommandTrigger", () => ({
  CommandTrigger: () => <div data-testid="command-trigger" />,
}));
vi.mock("@/components/shell/IdentityMenu", () => ({
  IdentityMenu: () => <div data-testid="identity-menu" />,
}));

const PROPS = { userEmail: "someone@example.com", displayName: null };

describe("the demo read-only badge", () => {
  it("is absent for a real tenant", () => {
    render(<Header {...PROPS} isDemo={false} />);
    expect(screen.queryByText(/Demo/)).toBeNull();
  });

  it("is shown for the demo tenant", () => {
    render(<Header {...PROPS} isDemo />);
    expect(screen.getByText(/Demo/)).toBeInTheDocument();
  });

  it("tells a screen reader that nothing can be saved", () => {
    // The visible text abbreviates to "Demo" below the sm breakpoint, so the
    // full meaning has to live somewhere that does not depend on viewport
    // width. If this label is ever dropped, a phone visitor gets the word
    // "Demo" and no indication that writes are refused.
    render(<Header {...PROPS} isDemo />);
    expect(
      screen.getByLabelText(
        "Demo workspace. This session is read-only — nothing can be saved.",
      ),
    ).toBeInTheDocument();
  });
});
