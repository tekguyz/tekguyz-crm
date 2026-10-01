import Link from "next/link";
import { notFound } from "next/navigation";

import { VariantThumb } from "@/app/(dev)/shell/detail/preview/VariantThumb";
import { SplitLanding } from "@/app/(dev)/shell/landing/split/SplitLanding";
import { StackedLanding } from "@/app/(dev)/shell/landing/stacked/StackedLanding";

// Index for the Landing Page — #32, two versions for the owner to pick from.
// Dev-only; see ../layout.tsx for all three gates.
//
// SAME CONTENT, DIFFERENT LAYOUT. Both render the same copy (LANDING and BRAND
// in src/lib/brand/copy.ts), the same screenshot, the same top bar and footer,
// and the real "Try the demo" button. Only the arrangement differs.
//
// No phone row: both stack at VIEWPORT breakpoints, so a narrow tile inside a
// wide window would still draw the desktop layout. Open a version full size
// in a phone-width window instead.
const VARIANTS = [
  {
    href: "/shell/landing/stacked",
    name: "Version A — Stacked",
    nav: "Centred promise, wide screenshot, three points in a row",
    cost: "The three points sit under the screenshot, so on a laptop they are below the first screen. A visitor who does not scroll never reads them.",
    Component: StackedLanding,
  },
  {
    href: "/shell/landing/split",
    name: "Version B — Split",
    nav: "Copy and numbered points left, app runs off the right edge",
    cost: "The screenshot is cropped on the right at every laptop width, so the Active column is only partly seen. The copy column is narrow, so the description wraps sooner.",
    Component: SplitLanding,
  },
];

const DESKTOP = { frameWidth: 1440, tileWidth: 560, tileHeight: 350 };

export default function LandingVariantsIndex() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="min-h-dvh bg-canvas-soft p-6 text-ink-main">
      <header className="mb-6">
        <Link href="/shell" className="text-body-sm text-accent underline underline-offset-2">
          ← Shell / IA comps
        </Link>
        <h1 className="text-display mt-1">Landing Page — two versions</h1>
        <p className="text-body-md mt-1 max-w-[70ch] text-ink-muted">
          Same words, same screenshot, same button. Only the layout changes.
          Click a tile to open it full size. On a phone both stack to one
          column, and the screenshot shrinks to the phone&apos;s width in both.
        </p>
      </header>

      <div className="flex flex-wrap gap-5">
        {VARIANTS.map(({ Component, ...variant }) => (
          <VariantThumb key={variant.href} {...variant} {...DESKTOP}>
            <Component />
          </VariantThumb>
        ))}
      </div>

      <section className="mt-8 max-w-[80ch]">
        <h2 className="text-h2">What each one costs</h2>
        <dl className="mt-2 flex flex-col">
          {VARIANTS.map((variant) => (
            <div key={variant.href} className="border-b border-hairline py-2 last:border-b-0">
              <dt className="text-title">{variant.name}</dt>
              <dd className="text-body-sm text-ink-muted">{variant.cost}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
