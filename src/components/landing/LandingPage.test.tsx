import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LandingPage } from "@/components/landing/LandingPage";
import { BRAND } from "@/lib/brand/copy";

vi.mock("@/lib/demo/start-demo", () => ({
  startDemo: vi.fn(),
}));

// Pins the content the spec names (#29 § Landing Page). Layout is judged in
// the browser — jsdom lays nothing out.
describe("LandingPage", () => {
  it("leads with the tagline as the page's one h1", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(BRAND.tagline);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("names the three points", () => {
    render(<LandingPage />);

    for (const title of ["Leads from your website", "One pipeline", "Follow-ups that stick"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  it("shows the app's screenshot once per screen size: phone and laptop", () => {
    const { container } = render(<LandingPage />);

    // jsdom applies no CSS, so both boxes are present here; in a browser the
    // `sm:` breakpoint displays exactly one of them.
    const shots = [...container.querySelectorAll("[data-shot]")];
    expect(shots.map((shot) => shot.getAttribute("data-shot"))).toEqual(["phone", "laptop"]);
    for (const shot of shots) expect(shot).toHaveAttribute("role", "img");
  });

  it("enters the demo by a form's submit button, never a link", () => {
    render(<LandingPage />);

    const button = screen.getByRole("button", { name: "Try the demo" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button.closest("form")).not.toBeNull();
    expect(screen.queryByRole("link", { name: /demo/i })).toBeNull();
  });

  it("links to Sign in and credits TEKGUYZ", () => {
    render(<LandingPage />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Built by TEKGUYZ" })).toHaveAttribute(
      "href",
      "https://tekguyz.com",
    );
  });

  it("never offers a sign-up link — accounts are invite-only", () => {
    render(<LandingPage />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.textContent).not.toMatch(/sign ?up|create account|register/i);
      expect(link.getAttribute("href")).not.toMatch(/signup/);
    }
  });
});
