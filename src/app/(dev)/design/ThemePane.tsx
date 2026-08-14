import { ButtonsSection } from "./sections/ButtonsSection";
import { FormsSection } from "./sections/FormsSection";
import { NavSection } from "./sections/NavSection";
import { SurfacesSection } from "./sections/SurfacesSection";
import { TokensSection } from "./sections/TokensSection";

// Forces an explicit theme on its subtree rather than inheriting the ambient
// one, so both themes are visible in a single screenshot without toggling.
// This works because .light and .dark are plain class selectors that redeclare
// the custom properties (see globals.css) — a nested wrapper re-themes its own
// subtree. next-themes still drives the ambient theme on <html> as normal.
//
// `text-ink-main` on the wrapper is required, not decorative. `color` inherits
// as an already-resolved value, so every unstyled descendant would otherwise
// inherit <body>'s ink — the ambient theme's, not the pane's. With the ambient
// theme dark, the light pane rendered near-white text on a near-white ground:
// the heading, all eight type-role rows and the elevation labels were invisible.
// Re-anchoring the colour here makes the subtree inherit this pane's own ink.
export function ThemePane({ theme }: { theme: "light" | "dark" }) {
  return (
    <section className={theme}>
      <div className="rounded-lg border border-hairline bg-canvas-soft p-4 text-ink-main">
        <h2 className="text-h1 mb-4 text-ink-main capitalize">{theme}</h2>
        <div className="flex flex-col gap-6">
          <TokensSection />
          <ButtonsSection />
          <FormsSection />
          <SurfacesSection />
          <NavSection />
        </div>
      </div>
    </section>
  );
}
