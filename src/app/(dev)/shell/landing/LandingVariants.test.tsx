import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BRAND } from "@/lib/brand/copy";

import { SplitLanding } from "./split/SplitLanding";
import { StackedLanding } from "./stacked/StackedLanding";

vi.mock("@/lib/demo/start-demo", () => ({
  startDemo: vi.fn(),
}));

// The two versions differ in LAYOUT only. These tests pin what must not
// differ: the content the spec names (#29 § Landing Page). Layout is judged
// in the browser — jsdom lays nothing out.
const VARIANTS = [
  ["Stacked", StackedLanding],
  ["Split", SplitLanding],
] as const;

describe.each(VARIANTS)("Version %s", (_name, Variant) => {
  it("leads with the tagline as the page's one h1", () => {
    render(<Variant />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(BRAND.tagline);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("names the three points", () => {
    render(<Variant />);

    for (const title of ["Leads from your website", "One pipeline", "Follow-ups that stick"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  it("shows one screenshot of the app", () => {
    render(<Variant />);

    expect(screen.getAllByRole("img", { name: /pipeline/i })).toHaveLength(1);
  });

  it("enters the demo by a form's submit button, never a link", () => {
    render(<Variant />);

    const button = screen.getByRole("button", { name: "Try the demo" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button.closest("form")).not.toBeNull();
    expect(screen.queryByRole("link", { name: /demo/i })).toBeNull();
  });

  it("links to Sign in and credits TEKGUYZ", () => {
    render(<Variant />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Built by TEKGUYZ" })).toHaveAttribute(
      "href",
      "https://tekguyz.com",
    );
  });

  it("never offers a sign-up link — accounts are invite-only", () => {
    render(<Variant />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.textContent).not.toMatch(/sign ?up|create account|register/i);
      expect(link.getAttribute("href")).not.toMatch(/signup/);
    }
  });
});
