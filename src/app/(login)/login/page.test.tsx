import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BRAND } from "@/lib/brand/copy";

vi.mock("@/lib/auth/actions", () => ({
  signIn: vi.fn(),
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

  it("points the demo at the real /demo route, as a plain anchor", async () => {
    await renderPage();

    const demo = screen.getByRole("link", { name: "View demo" });
    expect(demo).toHaveAttribute("href", "/demo");
    // Button's asChild gives the anchor its classes; the anchor stays an <a>.
    expect(demo.tagName).toBe("A");
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
