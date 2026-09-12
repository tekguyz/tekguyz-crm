import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

// Index for the shell/IA exploration. Dev-only — see layout.tsx for all three
// gates and why the check is repeated in every page here.
//
// These are COMPS, not a shipped change. Nothing under /shell is imported by
// the real AppShell, and the shipped sidebar, header and tab bar are byte-for-
// byte unchanged. The only file outside this directory that this exploration
// added is src/components/ui/Avatar.tsx (plus its identity helpers), which no
// shipped surface consumes yet.
const VARIANTS = [
  {
    href: "/shell/sectioned",
    name: "Variant A — Sectioned",
    thesis:
      "Static group captions, no disclosure. 48px header with a field-shaped search trigger. Active phone tab gets an accent plate.",
    cost: "Two extra caption rows of height, and the captions have to stay true as destinations move.",
    chosen: false,
  },
  {
    href: "/shell/disclosure",
    name: "Variant B — Disclosure",
    thesis:
      "Collapsible groups, the Plan CRM reference adapted. Search absorbs the header's width; identity drops to avatar-and-chevron. The active phone tab becomes a labelled pill and the others go icon-only.",
    cost: "A click to reach a closed destination, no disclosure at all in the 56px rail, and three of four phone tabs unlabelled.",
    chosen: false,
  },
  {
    href: "/shell/dock",
    name: "Variant C — Quiet",
    thesis:
      "No captions and no chevrons: groups are split by a full-bleed hairline and position does the grouping. Collapse moves to the panel's top edge, which empties a band out of the sidebar footer. The header carries the page title on the left and Help / search / seam / avatar on the right. The phone bar becomes an inset floating card.",
    cost: "Groups are unnamed, so a new user is shown that two clusters exist without being told what either is for; and the phone bar takes Level-1 elevation the ramp otherwise reserves for overlays.",
    chosen: true,
  },
];

export default function ShellVariantsIndex() {
  // Repeated from the layout on purpose — see layout.tsx. A layout that
  // throws does not stop its page rendering, so this is the check that keeps
  // the comp markup out of the production build entirely.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="min-h-dvh bg-canvas-soft p-6 text-ink-main">
      <header className="mb-6">
        <h1 className="text-display">Shell / IA redesign — Stage 1 comps</h1>
        <p className="text-body-md mt-1 max-w-[70ch] text-ink-muted">
          Three directions for the sidebar, the header and the mobile tab bar.
          Same seven destinations in all three — nothing new is invented. The
          collapse mechanism, the <code className="text-body-sm">tg_sidebar</code>{" "}
          cookie and WorkspaceBlock&apos;s static placeholder are untouched.
        </p>
        <p className="text-caption mt-2 max-w-[70ch] text-ink-muted">
          All three group the nav, which docs/DESIGN.md § The Application Shell
          decision 3 currently rules out permanently. Putting a real alternative
          in front of that decision is the point of Stage 1; nothing here ships
          until it is re-opened deliberately.
        </p>
        <p className="text-caption mt-2 max-w-[70ch] text-ink-muted">
          <strong className="text-ink-main">Picked on 2026-09-07: Variant C.</strong>{" "}
          Settings stays a sidebar destination and Help stays a header icon —
          the avatar menu keeps only account-scoped items (who you are signed
          in as, theme, sign out). A and B are kept as the record of what C was
          chosen over; they are not maintained past this date.
        </p>
      </header>

      {/* Prompt 2 of 4 lives one level down rather than in the grid below: it
          explores a different surface (the lead detail panel), not a fourth
          answer to the sidebar/header/tab-bar question these three share. */}
      <p className="text-body-md mb-6">
        <Link href="/shell/detail" className="text-accent underline underline-offset-2">
          Prompt 2 of 4 — lead detail panel variants →
        </Link>
        <br />
        <Link href="/shell/pipeline" className="text-accent underline underline-offset-2">
          Prompt 3 of 4 — pipeline card variants →
        </Link>
        <br />
        <Link href="/shell/form" className="text-accent underline underline-offset-2">
          Prompt 4 of 4 — lead / contact form variants →
        </Link>
        <br />
        <Link href="/shell/settings" className="text-accent underline underline-offset-2">
          Prompt 4 of 4 — Settings (Org Profile &amp; Branding) variants →
        </Link>
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        {VARIANTS.map((variant) => (
          <Card key={variant.href} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={variant.href}
                className="text-h2 text-accent underline underline-offset-2"
              >
                {variant.name}
              </Link>
              {/* Neutral, not accent: --accent is spoken for by the link
                  directly beside it, and two accents in one 60px row would
                  make neither of them mean anything. */}
              {variant.chosen ? (
                <Badge tone="neutral" dot className="shrink-0 border border-hairline">
                  Picked
                </Badge>
              ) : null}
            </div>
            <p className="text-body-sm text-ink-muted">{variant.thesis}</p>
            <p className="text-caption mt-auto pt-2 text-ink-muted">
              <span className="text-label uppercase">Cost — </span>
              {variant.cost}
            </p>
          </Card>
        ))}
      </div>
    </main>
  );
}
