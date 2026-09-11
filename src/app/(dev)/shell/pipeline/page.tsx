import Link from "next/link";
import { notFound } from "next/navigation";

import { VariantThumb } from "@/app/(dev)/shell/detail/preview/VariantThumb";
import { GroupedBoard } from "@/app/(dev)/shell/pipeline/grouped/GroupedCard";
import { LineBoard } from "@/app/(dev)/shell/pipeline/line/LineCard";
import { SplitBoard } from "@/app/(dev)/shell/pipeline/split/SplitCard";

// Index for the pipeline-card restyle — Shell/IA Stage 1, prompt 3 of 4.
// Dev-only; see ../layout.tsx for all three gates and why the check is
// repeated in every page here.
//
// SHOWS, DOES NOT DESCRIBE — the rule /shell/detail learned the hard way. Each
// tile is the real board component, rendered at its real column width and
// scaled down by the same VariantThumb that page uses (imported, not copied).
//
// A RESTYLE, NOT A DENSITY FIX. "Plain" is the whole brief. The field set is
// fixed and identical in all three — client_name, company, is_starred,
// estimated_revenue, next_action_at (with the Going Cold border), and
// assigned_to only when set. No status badge (the column is the status), no
// lead_source, no last activity. The overflow control is also identical in
// all three. Only the arrangement inside the card varies.
//
// Two columns per tile (New and Quoted) at the measured width of 269px each:
// the whole four-column board scaled into a 340px tile is too small to judge.
// Open a tile for the full board inside the shipped shell's real geometry.
//
// MEASURED, NOT ESTIMATED. Chromium, viewport exactly 1440x800, inside
// BoardFrame's copy of the shipped shell geometry (board box 652px tall,
// columns 269px wide), against preview/mock-pipeline.ts. "Visible" counts the
// New column's cards whose bottom edge clears the board without scrolling.
//
//   Line      115px full card (77 / 97 when company or assignee is absent)   5 visible
//   Split      81px full card (63 / 65 when sparse)                          7 visible
//   Grouped    65px, every card — sparse data never changes its height       8 visible
//
// Line is the tallest, not the most compact: one field per line spends a row
// on every value. Its gain is that nothing truncates beyond long names.
// Split and Grouped buy their height back with width, and the company name
// pays for it — Split truncates most companies, Grouped truncates the company
// on every assigned lead (see GroupedCard's comment for the floor).
const MEASUREMENTS = [
  { name: "Line", height: "115px (77–97 sparse)", visible: 5, cost: "Tallest. Nothing truncates but long names." },
  { name: "Split", height: "81px (63–65 sparse)", visible: 7, cost: "Company truncates on most cards — the metrics column takes 78–101px of a 219px card." },
  { name: "Grouped", height: "65px, fixed", visible: 8, cost: "Company truncates on every assigned lead; it keeps ~30px minimum." },
];

const COLUMN_WIDTH = 269;
const THUMB_STATUSES = ["NEW", "QUOTED"] as const;
const FRAME_WIDTH = COLUMN_WIDTH * THUMB_STATUSES.length + 16;

export default function PipelineVariantsIndex() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="min-h-dvh bg-canvas-soft p-6 text-ink-main">
      <header className="mb-6">
        <Link href="/shell" className="text-body-sm text-accent underline underline-offset-2">
          ← Shell / IA Stage 1
        </Link>
        <h1 className="text-display mt-1">Pipeline card — Stage 1 comps</h1>
        <p className="text-body-md mt-1 max-w-[70ch] text-ink-muted">
          Three arrangements of the same six fields on the Kanban card. Same
          fixture, same Going Cold treatment, same &ldquo;+N more&rdquo; control
          after ten cards in all three — only the layout inside the card
          changes. Click a tile to open the full board.
        </p>
        <p className="text-caption mt-2 max-w-[70ch] text-ink-muted">
          <strong className="text-ink-main">Picked on 2026-09-11: Variant Grouped.</strong>{" "}
          The plainest of the three, every card the same height, and the most
          cards on screen. Its cost — a truncated company on assigned leads —
          is paid on a board that will hold only a handful of leads for weeks
          to months, so it was judged cheap to live with and easy to revisit.
          Line and Split are kept as the record of what Grouped was chosen
          over; they are not maintained past this date.
        </p>
      </header>

      <div className="flex flex-wrap gap-5">
        <VariantThumb href="/shell/pipeline/line" name="Variant Line" nav="One field per line" frameWidth={FRAME_WIDTH}>
          <LineBoard statuses={THUMB_STATUSES} />
        </VariantThumb>

        <VariantThumb href="/shell/pipeline/split" name="Variant Split" nav="Identity left, metrics right" frameWidth={FRAME_WIDTH}>
          <SplitBoard statuses={THUMB_STATUSES} />
        </VariantThumb>

        <VariantThumb href="/shell/pipeline/grouped" name="Variant Grouped" nav="Header row + one meta line" frameWidth={FRAME_WIDTH} picked>
          <GroupedBoard statuses={THUMB_STATUSES} />
        </VariantThumb>
      </div>

      {/* Numbers stay in words below the pictures, the /shell/detail rule:
          "how many fit" is judged better as a number than by eye. */}
      <section className="mt-8 max-w-[80ch]">
        <h2 className="text-h2">Measured at 1440×800</h2>
        <dl className="mt-2 flex flex-col">
          {MEASUREMENTS.map((entry) => (
            <div key={entry.name} className="border-b border-hairline py-2 last:border-b-0">
              <dt className="text-title">
                {entry.name} — {entry.visible} cards visible · {entry.height}
              </dt>
              <dd className="text-body-sm text-ink-muted">{entry.cost}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-caption mt-6 max-w-[70ch] text-ink-muted">
        Static fixture data. No Server Action, no Supabase query, no migration.
        The shipped KanbanCard, FocusListCard and Card primitive are untouched.
      </p>
    </main>
  );
}
