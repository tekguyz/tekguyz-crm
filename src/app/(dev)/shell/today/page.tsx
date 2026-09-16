import Link from "next/link";
import { notFound } from "next/navigation";

import { VariantThumb } from "@/app/(dev)/shell/detail/preview/VariantThumb";
import { BriefToday } from "@/app/(dev)/shell/today/brief/BriefToday";
import { LedgerToday } from "@/app/(dev)/shell/today/ledger/LedgerToday";
import { LANE_CARD_CAP } from "@/app/(dev)/shell/today/preview/mock-today";
import { Card } from "@/components/ui/Card";

// Index for the Today redesign — Stage 1 comps.
// Dev-only; see ../layout.tsx for all three gates and why the check is
// repeated in every page here.
//
// SHOWS, DOES NOT DESCRIBE — the rule /shell/detail learned the hard way. Each
// tile is the real page component at its real content width, scaled down by
// the same VariantThumb those pages use (imported, not copied). The tile
// renders the comp BARE rather than inside TodayFrame, the way the pipeline
// index does: the frame's h-dvh would not mean anything inside a scaled box.
//
// A RESTYLE AND A DENSITY DECISION, NOT A DATA CHANGE. The field set is fixed
// and identical in both — client_name, is_starred, status, company,
// estimated_revenue, next_action_at — and so is the cap-and-expand control,
// the Going Cold treatment, and the stage-tone mapping. Only the arrangement
// inside the card and the number of rows it spends vary.
//
// MEASURED, NOT ESTIMATED. Chromium, inside TodayFrame's copy of the shipped
// shell geometry (sidebar 240px, header 56px, main p-6), at demo scale —
// twenty leads, six tasks. The scroll box is 744px tall at both viewports;
// "used" is the content's own height plus main's padding, because
// main.scrollHeight floors at clientHeight and reads "744 of 744" on a page
// using three quarters of the box. Taken by npm run check:widths, which drives
// a real Chrome — see scripts/check-comp-text-widths.mjs.
//
// NEITHER SCROLLS, AND THAT IS THE WHOLE POINT — but the slack is not close to
// equal, and 1024px is where the difference bites.
const MEASUREMENTS = [
  {
    name: "Ledger",
    card: "65px, every card",
    page: "547px of 744px at 1440 · 621px at 1024",
    cost: "The narrowest values on the page. Both rows share their width with something that cannot shrink — the pills on row one, revenue and the date on row two — so the name and the company truncate earliest here. Both clear the 24px floor at 1024px.",
  },
  {
    name: "Brief",
    card: "91px, every card",
    page: "652px of 744px at 1440 · 728px at 1024",
    cost: "26px taller per card. Buys the company a line of its own and gives the pills a row to themselves, but at 1024px it finishes 16px from the bottom edge — so the fifth section, or one more card of cap, puts it over.",
  },
];

// THE CONTENT BOX OF THE REAL SHELL AT 1440. 1440 - 240 (sidebar) - 48 (p-6).
// Passing it per tile is what keeps the preview honest: a component rendered
// at 620px would reflow into its own tablet layout and the tile would be
// showing something the variant never looks like at the width being judged.
const CONTENT_WIDTH = 1152;

export default function TodayVariantsIndex() {
  // Repeated from the layout on purpose — see layout.tsx. A layout that throws
  // does not stop its page rendering, so this is the check that keeps the comp
  // markup out of the production build.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="min-h-dvh bg-canvas-soft p-6 text-ink-main">
      <header className="mb-6">
        <Link href="/shell" className="text-body-sm text-accent underline underline-offset-2">
          ← Shell / IA comps
        </Link>
        <h1 className="text-display mt-1">Today — Stage 1 comps</h1>
        <p className="text-body-md mt-1 max-w-[75ch] text-ink-muted">
          Two densities for the one page that never went through Design System
          v2 or the Shell/IA pass. Same four sections, same fixed field set,
          same stage-tone mapping, same cap-and-expand control in all four
          lanes — only the arrangement inside the card and the number of rows it
          spends differ. Click a tile for the full page inside the shipped
          shell&apos;s real geometry.
        </p>
        <p className="text-caption mt-2 max-w-[75ch] text-ink-muted">
          Static fixture. No Server Action, no Supabase query, no migration.
          The shipped <code className="text-body-sm">TodayAgenda</code>,{" "}
          <code className="text-body-sm">LeadCard</code> and{" "}
          <code className="text-body-sm">TasksDueQueue</code> are untouched, and
          so is <code className="text-body-sm">LEAD_COLUMNS</code>.
        </p>
      </header>

      <div className="flex flex-wrap gap-5">
        <VariantThumb
          href="/shell/today/ledger"
          name="Variant Ledger"
          nav="Two rows · identity first"
          frameWidth={CONTENT_WIDTH}
          tileWidth={620}
          tileHeight={400}
        >
          <LedgerToday />
        </VariantThumb>

        <VariantThumb
          href="/shell/today/brief"
          name="Variant Brief"
          nav="Three rows · money first"
          frameWidth={CONTENT_WIDTH}
          tileWidth={620}
          tileHeight={400}
        >
          <BriefToday />
        </VariantThumb>
      </div>

      {/* Numbers stay in words below the pictures, the /shell/detail rule:
          "how much fits" is judged better as a number than by eye. */}
      <section className="mt-8 max-w-[85ch]">
        <h2 className="text-h2">Measured at 1440×800</h2>
        <dl className="mt-2 flex flex-col">
          {MEASUREMENTS.map((entry) => (
            <div key={entry.name} className="border-b border-hairline py-2 last:border-b-0">
              <dt className="text-title">
                {entry.name} — page {entry.page} · card {entry.card}
              </dt>
              <dd className="text-body-sm text-ink-muted">{entry.cost}</dd>
            </div>
          ))}
        </dl>
        <p className="text-caption mt-2 text-ink-muted">
          Both fit at both viewports. The cap is {LANE_CARD_CAP} cards per
          section, one number in{" "}
          <code>preview/mock-today.ts</code> read by all four lanes and by the
          tests. Check the other end too:{" "}
          <Link href="/shell/today/ledger?scale=sparse" className="text-accent underline underline-offset-2">
            Ledger sparse
          </Link>
          {" · "}
          <Link href="/shell/today/brief?scale=sparse" className="text-accent underline underline-offset-2">
            Brief sparse
          </Link>
          {" · "}
          <Link href="/shell/today/ledger?scale=empty" className="text-accent underline underline-offset-2">
            Ledger empty
          </Link>
          {" · "}
          <Link href="/shell/today/brief?scale=empty" className="text-accent underline underline-offset-2">
            Brief empty
          </Link>
          .
        </p>
      </section>

      {/* THE DECISION THIS PROMPT IS ACTUALLY ASKING FOR. Presented the way the
          pipeline-card and detail-panel picks were: the fork stated, both
          branches costed, no branch taken silently. */}
      <section className="mt-8 max-w-[85ch]">
        <h2 className="text-h2">Open: what should SLA Critical actually mean?</h2>
        <p className="text-body-md mt-1 text-ink-muted">
          The prompt asks whether SLA Critical should move onto the same{" "}
          <code className="text-body-sm">next_action_at</code>-overdue signal
          Going Cold already uses. Read against the code, it is already there:{" "}
          <code className="text-body-sm">getSlaCriticalLeads</code> filters{" "}
          <code className="text-body-sm">next_action_at &lt; now()</code>, and{" "}
          <code className="text-body-sm">isOverdue()</code> — the Going Cold
          test — is the same comparison. They are one predicate with two names.
        </p>
        <p className="text-body-md mt-2 text-ink-muted">
          So the real fork is the consequence, and it is visible in the tiles
          above: because the lane&apos;s membership test IS the cold test, every
          card in SLA Critical is dashed. Inside that lane the treatment
          separates nothing — it is the lane. That is a decision to take, not a
          bug to fix.
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Card className="flex flex-col gap-2">
            <h3 className="text-title">Fork A — leave it identical</h3>
            <p className="text-body-sm text-ink-muted">
              SLA Critical stays &ldquo;every overdue lead&rdquo;. One predicate,
              one meaning of overdue everywhere in the app, no new column and no
              migration. The dashed border inside the lane is redundant but
              consistent with the same card in High-Value and Starred, where it
              does carry information.
            </p>
            <p className="text-caption mt-auto pt-2 text-ink-muted">
              <span className="text-label uppercase">Cost — </span>
              the lane is a duplicate view: every card in it also appears in
              High-Value or Starred wearing the same dashed border, so the
              page&apos;s most urgent section is the one with the least
              differentiation inside it.
            </p>
          </Card>

          <Card className="flex flex-col gap-2">
            <h3 className="text-title">Fork B — make it a stricter slice</h3>
            <p className="text-body-sm text-ink-muted">
              Going Cold stays &ldquo;overdue&rdquo;; SLA Critical narrows to an
              urgent subset — overdue by more than some threshold, or overdue{" "}
              <em>and</em> above a revenue floor. The dashed border then means
              something inside the lane again, and the lane stops being a
              restatement of &ldquo;everything overdue&rdquo;.
            </p>
            <p className="text-caption mt-auto pt-2 text-ink-muted">
              <span className="text-label uppercase">Cost — </span>
              a second definition of urgency to keep true, a threshold somebody
              has to choose (and probably configure per org later), and a real
              change to <code>getSlaCriticalLeads</code> — which is data-layer
              work this Stage 1 prompt is fenced out of.
            </p>
          </Card>
        </div>

        <p className="text-body-sm mt-3 text-ink-muted">
          <strong className="text-ink-main">Not decided here.</strong> Both comps
          render Fork A, because it is what the code does today and Stage 1 is
          not allowed to change a query. Picking B is a Stage 2 data change with
          a threshold decision attached.
        </p>
      </section>

      {/* Two more things a human should know before picking, both found by
          reading the shipped code rather than the brief. */}
      <section className="mt-8 max-w-[85ch]">
        <h2 className="text-h2">Two corrections to the brief</h2>

        <div className="mt-2 flex flex-col gap-3">
          <Card className="flex flex-col gap-2">
            <h3 className="text-title">The stage label was never plain text</h3>
            <p className="text-body-sm text-ink-muted">
              The shipped <code>LeadCard</code> already renders a tinted{" "}
              <code>Badge</code> from the shared{" "}
              <code>STATUS_TONE</code> map — the same map{" "}
              <code>/reports</code> reads. What makes the page grey is one
              ternary: <code>tone=&#123;overdue ? &quot;neutral&quot; : STATUS_TONE[...]&#125;</code>.
              Every lead in SLA Critical is overdue, so every stage pill in the
              lane you triage first goes grey.
            </p>
            <p className="text-body-sm text-ink-muted">
              Both comps split the two signals onto two elements instead:{" "}
              <strong className="text-ink-main">stage</strong> keeps{" "}
              <code>STATUS_TONE</code> always, and{" "}
              <strong className="text-ink-main">cold</strong> gets Card&apos;s
              dashed border plus its own pill on Badge&apos;s{" "}
              <code>cold</code> tone. Both halves of the Going Cold rule
              survive; neither eats the other. Badge&apos;s <code>cold</code>{" "}
              tone only became legal for this on 2026-08-17, when{" "}
              <code>--cold-fg</code> fixed its AA failure — and LeadCard&apos;s
              own comment says adopting it was &ldquo;left as its own
              decision&rdquo;. This is that decision, as a comp rather than a
              quiet edit.
            </p>
          </Card>

          <Card className="flex flex-col gap-2">
            <h3 className="text-title">There are five sections, not four</h3>
            <p className="text-body-sm text-ink-muted">
              The real page renders <code>NeedsReviewQueue</code> above Tasks
              Due — the Spam Shield&apos;s review surface, which a permanent
              rule requires to stay a routing destination. It self-hides when
              empty, which is its state in both the demo and the live org, so
              it is absent from these comps and the fence kept it out of scope.
              Whichever variant wins, Stage 2 has to say what that band looks
              like when it does appear, because it lands above everything
              measured here and the viewport numbers move when it does.
            </p>
          </Card>
        </div>
      </section>

      <p className="text-caption mt-8 max-w-[75ch] text-ink-muted">
        Charts are deliberately absent. They stay exclusive to{" "}
        <code>/reports</code>; Today is a triage surface, not a reporting one.
      </p>
    </main>
  );
}
