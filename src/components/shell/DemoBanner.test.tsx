import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/demo/start-demo", () => ({ leaveDemo: vi.fn() }));

import { DemoBanner } from "@/components/shell/DemoBanner";

// The demo banner (#29 user stories 20–22). Labelled aside[aria-label='Demo'],
// the selector the showcase screenshot scripts in the other apps look for.
describe("the demo banner", () => {
  it("is an aside labelled Demo that says the Guest is in the demo", () => {
    render(<DemoBanner />);
    const banner = screen.getByRole("complementary", { name: "Demo" });
    expect(within(banner).getByText("You're in the demo")).toBeInTheDocument();
  });

  it("links back to tekguyz.com", () => {
    render(<DemoBanner />);
    expect(screen.getByRole("link", { name: "Built by TEKGUYZ" })).toHaveAttribute(
      "href",
      "https://tekguyz.com",
    );
  });

  it("has a way to leave, which is a form post, never a link", () => {
    // Leaving signs out. Signing out on a GET would let a prefetch do it.
    render(<DemoBanner />);
    const leave = screen.getByRole("button", { name: "Leave the demo" });
    expect(leave).toHaveAttribute("type", "submit");
    expect(leave.closest("form")).not.toBeNull();
  });
});
