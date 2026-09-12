import Link from "next/link";
import { notFound } from "next/navigation";

import { VariantThumb } from "@/app/(dev)/shell/detail/preview/VariantThumb";
import { MOCK_ORG } from "@/app/(dev)/shell/settings/preview/mock-org";
import { RailSettings } from "@/app/(dev)/shell/settings/rail/RailSettings";
import { SplitSettings } from "@/app/(dev)/shell/settings/split/SplitSettings";
import { StackedSettings } from "@/app/(dev)/shell/settings/stacked/StackedSettings";

// Index for Settings → Org Profile & Branding — Shell/IA Stage 1, prompt 4 of
// 4. Dev-only; see ../layout.tsx for all three gates and why the check is
// repeated in every page here.
//
// SHOWS, DOES NOT DESCRIBE — /shell/detail's rule, kept by /shell/pipeline.
// Each tile is the real variant at a real page width, scaled by the same
// imported VariantThumb.
//
// THREE SECTIONS, IDENTICAL IN ALL THREE VARIANTS: organization profile,
// branding, and the inbound lead webhook. They come from one shared
// preview/SettingsBlocks.tsx, so a visible difference between two tiles is a
// difference in LAYOUT and never a typo in one of them.
//
// SCOPE IS ORG PROFILE & BRANDING ONLY. The shipped /settings page also
// carries Team, API keys and Account. None of them appears here — not as a
// stub, not as a disabled rail row, not as reserved space. Team role
// management has its own discovery pass and is outside this prompt's fence.
//
// AND THERE IS NO LOGO UPLOAD. public.organizations has four columns beyond
// its id and created_at — name, webhook_secret, timezone, currency_format —
// so "branding" here is the mark the app already ships and the two rules that
// pick which asset is used. A control for a per-org logo would be inventing a
// column, a bucket and an action at the same time.
// MEASURED, NOT ESTIMATED. Headless Chrome, viewport exactly 1440x800, with
// the same CDP harness scripts/check-comp-text-widths.mjs uses. The scrolling
// figure is the honest separator here: the content box is 668px tall in all
// three, and only one of them overflows it.
const MEASUREMENTS = [
  {
    name: "Stacked",
    width: "768px column · 670px inputs",
    firstControl: "127px down",
    scroll: "893px of content in a 668px box — the only variant that scrolls",
    cost: "Leaves most of a 1440px screen empty, and every explanation pushes its own controls further down.",
  },
  {
    name: "Rail",
    width: "208px rail · 744px pane · 694px inputs",
    firstControl: "127px down",
    scroll: "fits, but only because two of the three sections are not rendered",
    cost: "Hides two sections of three. With three, a label is a promise about content you cannot see.",
  },
  {
    name: "Split",
    width: "1024px row · 256px explanation · 688px inputs",
    firstControl: "43px down",
    scroll: "all three sections fit in the 668px box",
    cost: "Below the md breakpoint the two columns stack, at which point it is Stacked with extra rules.",
  },
];

const FRAME_WIDTH = 1160;
const TILE_WIDTH = 440;
const TILE_HEIGHT = 300;

export default function SettingsVariantsIndex() {
  if (process.env.NODE_ENV !== "development") notFound();

  const thumb = { frameWidth: FRAME_WIDTH, tileWidth: TILE_WIDTH, tileHeight: TILE_HEIGHT };

  return (
    <main className="min-h-dvh bg-canvas-soft p-6 text-ink-main">
      <header className="mb-6">
        <Link href="/shell" className="text-body-sm text-accent underline underline-offset-2">
          ← Shell / IA Stage 1
        </Link>
        <h1 className="text-display mt-1">Settings — Org Profile &amp; Branding — Stage 1 comps</h1>
        <p className="text-body-md mt-1 max-w-[70ch] text-ink-muted">
          Three arrangements of the same three sections. Same fields, same
          copy, same controls in all three — only the layout changes. Click a
          tile to open it full size, where each variant also links to the
          longest-values fixture.
        </p>
        <p className="text-caption mt-2 max-w-[70ch] text-ink-muted">
          <strong className="text-ink-main">Not yet picked.</strong> The review
          that chooses between these has not happened. Nothing here is wired to
          a Server Action or a query, and Team, API keys and Account are
          deliberately absent rather than stubbed.
        </p>
      </header>

      <div className="flex flex-wrap gap-5">
        <VariantThumb
          href="/shell/settings/stacked"
          name="Variant Stacked"
          nav="One column, nothing hidden"
          {...thumb}
        >
          <StackedSettings initial={MOCK_ORG} />
        </VariantThumb>

        <VariantThumb
          href="/shell/settings/rail"
          name="Variant Rail"
          nav="Section rail, one pane at a time"
          {...thumb}
        >
          <RailSettings initial={MOCK_ORG} />
        </VariantThumb>

        <VariantThumb
          href="/shell/settings/split"
          name="Variant Split"
          nav="Explanation left, controls right"
          {...thumb}
        >
          <SplitSettings initial={MOCK_ORG} />
        </VariantThumb>
      </div>

      {/* Numbers stay in words below the pictures — /shell/detail's rule, kept
          by /shell/pipeline. */}
      <section className="mt-8 max-w-[80ch]">
        <h2 className="text-h2">Measured at 1440×800</h2>
        <dl className="mt-2 flex flex-col">
          {MEASUREMENTS.map((entry) => (
            <div key={entry.name} className="border-b border-hairline py-2 last:border-b-0">
              <dt className="text-title">
                {entry.name} — {entry.width} · first control {entry.firstControl}
              </dt>
              <dd className="text-body-sm text-ink-muted">{entry.scroll}</dd>
              <dd className="text-body-sm text-ink-muted">
                <span className="text-label uppercase">Cost — </span>
                {entry.cost}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-caption mt-6 max-w-[70ch] text-ink-muted">
        Static fixture data. No Server Action, no Supabase query, no migration,
        no RLS. The shipped OrgDetailsPanel, TeamPanel, ApiKeysPanel and
        AccountPanel are untouched.
      </p>
    </main>
  );
}
