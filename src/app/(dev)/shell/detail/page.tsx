import Link from "next/link";
import { notFound } from "next/navigation";

import { AccordionPanel } from "@/app/(dev)/shell/detail/accordion/AccordionPanel";
import { VariantThumb } from "@/app/(dev)/shell/detail/preview/VariantThumb";
import { JumpPanel } from "@/app/(dev)/shell/detail/jump/JumpPanel";
import { SplitPanel } from "@/app/(dev)/shell/detail/split/SplitPanel";
import { TabsPanel } from "@/app/(dev)/shell/detail/tabs/TabsPanel";

// Index for the lead/contact detail-panel exploration — Shell/IA Stage 1,
// prompt 2 of 4. Dev-only; see ../layout.tsx for all three gates and why the
// check is repeated in every page here.
//
// THIS PAGE SHOWS THE FOUR VARIANTS. It does not describe them. The first
// draft did the opposite — four cards of prose, no picture of anything — and
// was correctly rejected as unusable: choosing between four layouts is a
// looking task, not a reading task. Each tile below renders the real component
// at its real width, scaled down (see VariantThumb).
//
// COMPS, NOT A SHIPPED CHANGE. Nothing here is imported by anything in
// src/components/leads/profile/, and the shipped ProfileSheet and its four
// sibling modules are unchanged. All data is the static fixture in
// preview/mock-lead.ts — no Server Action, no query, no migration.
//
// THE PROBLEM ALL FOUR ANSWER, from tekguyz-current-lead-slide-out-drawer.png:
// the shipped panel spends ~96px of a max-w-lg panel on a header carrying two
// lines of text, and everything below it is one unbroken scroll with no way to
// reach Tasks, Enquiries, Activity or Notes directly.
//
// The header fix is SHARED and identical in all four (CompactHeader +
// MetaStrip, from plancrm-drawer.webp). The variants differ ONLY in the answer
// to section navigation, which is the axis this prompt exists to explore.
// MEASURED, NOT ESTIMATED. Chromium, 1440x800 viewport, against the fixture in
// preview/mock-lead.ts:
//
//   A's jump strip     41px
//   B's tab strip      36px   <- A costs FIVE px more than B, not 36
//   C's rows            0px of strip
//   panel content     952px against a 633px scroller = 1.5 screens
//
// The first draft of this list said A "costs ~36px it never gives back". That
// was measured against having no strip at all, which only C is — B carries a
// strip of its own and pays essentially the same. Stating it as A's cost made
// A look expensive against the variant it is actually tied with. A strip is a
// decision between A/B and C, never between A and B.
const COSTS = [
  {
    name: "A — Jump strip",
    cost: "41px of strip — five more than B's tabs, so effectively free against it. What it does NOT do is shorten the scroll: at 1440x800 this lead is 1.5 screens either way, and a long activity log still scrolls. It buys a way to skip, not less content.",
  },
  {
    name: "B — Tabs",
    cost: "Two sections can never be read together — tasks beside the enquiry that created them is the obvious loss — and unselected sections are unmounted, so Tasks forgets its Open/Completed choice each time you leave.",
  },
  {
    name: "C — Accordion",
    cost: "The only one with no strip at all — that 41px goes back to content. Paid for by hiding everything: reading two sections is two clicks, and the panel opens mostly closed, so it is the only variant where you work before you see anything.",
  },
  {
    name: "D — Split",
    cost: "At max-w-3xl it stops being a slide-over and becomes most of the screen, which weakens the reason a slide-over exists. Below md it collapses to exactly Variant B, so on a phone it contributes nothing of its own.",
  },
];

export default function DetailVariantsIndex() {
  // See ../layout.tsx: the layout's gate does not stop this page rendering, so
  // this repetition is what keeps the comp markup out of a production build.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="min-h-dvh bg-canvas-soft p-6 text-ink-main">
      <header className="mb-6">
        <Link href="/shell" className="text-body-sm text-accent underline underline-offset-2">
          ← Shell / IA Stage 1
        </Link>
        <h1 className="text-display mt-1">Lead detail panel — Stage 1 comps</h1>
        <p className="text-body-md mt-1 max-w-[70ch] text-ink-muted">
          Four answers to one question: how do you reach Tasks, Enquiries,
          Activity or Notes without scrolling the whole panel? The compact
          header, the 4-up metadata strip and all five section bodies are
          identical in all four — only the navigation varies, so the comparison
          is honest. Click a tile to open it full size.
        </p>
        <p className="text-caption mt-2 max-w-[70ch] text-ink-muted">
          <strong className="text-ink-main">Picked on 2026-09-09: Variant A.</strong>{" "}
          It hides nothing and adds a way to skip, for five px more than B.
          B cannot show a task beside the enquiry that created it, C hides the
          most on the normal-sized lead, and D stops being a slide-over. A now
          carries C&apos;s counts in its strip, so it does not read as a tab
          bar. B, C and D are kept as the record of what A was chosen over;
          they are not maintained past this date.
        </p>
      </header>

      <div className="flex flex-wrap gap-5">
        {/* Each thumb renders the REAL panel component. If a variant changes,
            its tile changes with it — a screenshot would have gone stale on the
            first edit. */}
        <VariantThumb href="/shell/detail/jump" name="Variant A — Jump strip" nav="Sticky jump strip + scroll-spy + counts" frameWidth={512} picked>
          <JumpPanel />
        </VariantThumb>

        <VariantThumb href="/shell/detail/tabs" name="Variant B — Tabs" nav="Tabbed switcher, one section at a time" frameWidth={512}>
          <TabsPanel />
        </VariantThumb>

        <VariantThumb href="/shell/detail/accordion" name="Variant C — Accordion" nav="Collapsed sections with counts" frameWidth={512}>
          <AccordionPanel />
        </VariantThumb>

        <VariantThumb href="/shell/detail/split" name="Variant D — Split" nav="Standing left column + tabbed right" frameWidth={768}>
          <SplitPanel />
        </VariantThumb>
      </div>

      {/* The costs stay in words because a cost is not a visible property —
          you cannot see "Tasks forgets its tab" in a still. They sit BELOW the
          pictures rather than instead of them. */}
      <section className="mt-8 max-w-[80ch]">
        <h2 className="text-h2">What each one costs</h2>
        <dl className="mt-2 flex flex-col">
          {COSTS.map((entry) => (
            <div key={entry.name} className="border-b border-hairline py-2 last:border-b-0">
              <dt className="text-title">{entry.name}</dt>
              <dd className="text-body-sm text-ink-muted">{entry.cost}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-caption mt-6 max-w-[70ch] text-ink-muted">
        Static fixture data. No Server Action, no Supabase query, no migration.
        The shipped panel in{" "}
        <code className="text-body-sm">src/components/leads/profile/</code> is
        untouched, and Tasks, the enquiry timeline and the note composer are
        carried over restyled rather than rebuilt.
      </p>
    </main>
  );
}
