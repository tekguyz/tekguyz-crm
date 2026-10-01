import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BRAND } from "@/lib/brand/copy";

vi.mock("@/lib/demo/start-demo", () => ({
  startDemo: vi.fn(),
}));

const { default: WelcomePage, metadata } = await import("./page");

// The Landing Page, which a signed-out `/` is rewritten to (the rewrite itself
// is pinned in src/lib/supabase/middleware.test.ts).
describe("the Landing Page", () => {
  it("renders the pitch, the demo button and the sign-in link", () => {
    render(<WelcomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(BRAND.tagline);
    expect(screen.getByRole("button", { name: "Try the demo" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("is the one page search engines may index, at the address /", () => {
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates?.canonical).toBe("/");
  });

  it("keeps the root layout's link preview card, image included", () => {
    // A page-level openGraph or twitter object replaces the root's, and the
    // branded og:image goes with it.
    expect(metadata.openGraph).toBeUndefined();
    expect(metadata.twitter).toBeUndefined();
    expect(metadata.description).toBe(BRAND.description);
  });
});
