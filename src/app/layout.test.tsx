import { describe, expect, it, vi } from "vitest";

import { BRAND } from "@/lib/brand/copy";

vi.mock("next/font/google", () => ({ Inter: () => ({ variable: "--font-inter" }) }));
vi.mock("next-themes", () => ({ ThemeProvider: () => null }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("./globals.css", () => ({}));

const { metadata } = await import("./layout");
const ogImage = await import("./opengraph-image");

// The Landing Page sets no card of its own, so this is the link preview a
// shared `/` shows: title, description and image.
describe("the link preview card", () => {
  it("carries a title and a description", () => {
    expect(metadata.openGraph).toMatchObject({ title: BRAND.name, description: BRAND.description });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: BRAND.name,
      description: BRAND.description,
    });
  });

  it("gets its image from opengraph-image.tsx, not a manual entry that would override it", () => {
    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(ogImage.default).toBeTypeOf("function");
    expect(ogImage.size).toEqual({ width: 1200, height: 630 });
  });
});
