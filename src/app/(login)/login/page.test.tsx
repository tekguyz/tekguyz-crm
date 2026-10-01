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

  it("sends a visitor who is just looking to the Landing Page, with no demo door here", async () => {
    // The demo's one door is the Landing Page's button (#32). /login only
    // points there, by a plain link to `/` that starts nothing.
    await renderPage();

    expect(screen.queryByRole("button", { name: "Try the demo" })).toBeNull();
    expect(screen.getByRole("link", { name: /see what it does/i })).toHaveAttribute("href", "/");
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
