import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BRAND } from "@/lib/brand/copy";

vi.mock("@/lib/auth/actions", () => ({
  signIn: vi.fn(),
}));
vi.mock("@/lib/demo/start-demo", () => ({
  startDemo: vi.fn(),
}));

const { default: LoginPage } = await import("./page");

async function renderPage(params: { error?: string; message?: string; next?: string } = {}) {
  return render(await LoginPage({ searchParams: Promise.resolve(params) }));
}

describe("/login — Variant Split, wired", () => {
  it("says what the product is, from BRAND rather than a retyped literal", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText(BRAND.tagline)).toBeInTheDocument();
    expect(screen.getByText(BRAND.description)).toBeInTheDocument();
  });

  it("offers the demo as a button that posts, never as a link", async () => {
    // Until #32's Landing Page, this is the demo's door. A link that starts
    // the demo is what let a prefetch replace a real session on 2026-09-11,
    // so the door is a form's submit button and nothing else.
    await renderPage();

    const demo = screen.getByRole("button", { name: "Try the demo" });
    expect(demo).toHaveAttribute("type", "submit");
    expect(demo.closest("form")).not.toBeNull();
    expect(screen.queryByRole("link", { name: /demo/i })).toBeNull();
  });

  it("never offers a sign-up link — accounts are invite-only", async () => {
    await renderPage();

    for (const link of screen.getAllByRole("link")) {
      expect(link.textContent).not.toMatch(/sign ?up|create account|register/i);
      expect(link.getAttribute("href")).not.toMatch(/signup/);
    }
  });

  it("hands the query string's error, notice and next to the form", async () => {
    const { container } = await renderPage({
      error: "Invalid login credentials",
      message: "Your password has been updated.",
      next: "/reports",
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid login credentials");
    expect(screen.getByRole("status")).toHaveTextContent("Your password has been updated.");
    expect(container.querySelector('input[name="next"]')).toHaveValue("/reports");
  });
});
