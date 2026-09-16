"use client";

import {
  ColdBadge,
  StageBadge,
  StarMark,
  TaskOverdueBadge,
  type CardBodyProps,
  type CardVariant,
  type TaskBodyProps,
} from "@/app/(dev)/shell/today/preview/CompCard";
import { TodayComp } from "@/app/(dev)/shell/today/preview/TodayComp";
import type { Lead } from "@/lib/leads/queries";
import type { TaskDue } from "@/lib/tasks/queries";

// VARIANT LEDGER - two rows, identity first.
//
// THE THESIS: you scan this page by NAME and by STAGE. The name owns the top
// row and the stage pills sit at the top right, which is where the eye lands
// after the name on a left-to-right scan, so a lane reads as a colour sequence
// before you have read a single word of it. Money is reference, not headline,
// so it drops into the muted meta line with the date.
//
// THE COST, MEASURED, NOT ESTIMATED. At 1024x800 the three lanes are 232px
// wide (frame main 736px, three columns, gap-5), so a card's content box is
// 208px. Row one spends most of its width on the two pills, and row two on
// revenue plus the date; the name and the company take what is left and both
// truncate early. This is the variant that buys its height by spending width,
// and the company pays for it. The real numbers are on ../page.tsx, taken from
// the browser rather than from this comment.
function LedgerBody({ lead, cold, revenue, due }: CardBodyProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <StarMark starred={lead.is_starred} cold={cold} />
          <p className="text-body-md truncate font-medium">{lead.client_name}</p>
        </div>
        {/* Both pills, always in this order: stage first, then the cold pill
            when it applies. See CompCard's StageBadge comment for why the two
            signals are on two elements instead of one. */}
        <div className="flex shrink-0 items-center gap-1">
          <StageBadge lead={lead} />
          <ColdBadge cold={cold} />
        </div>
      </div>

      <div className="text-caption flex items-center justify-between gap-2 text-ink-muted">
        {/* The company is the only thing on this card allowed to reach zero
            characters, and it is guarded by min-w-0 + truncate rather than
            being dropped: a lead with no company renders an empty span and the
            date stays anchored right, so a sparse card is the same height as a
            full one. */}
        <span className="min-w-0 truncate">{lead.company ?? ""}</span>
        <span className="flex shrink-0 items-center gap-1 tabular-nums">
          <span>{revenue}</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">{due}</span>
        </span>
      </div>
    </div>
  );
}

// The task card at Ledger's density. The shipped rule is kept: an overdue TASK
// gets the decorative orange pill, never the Going Cold treatment.
function LedgerTaskBody({ task, overdue, due }: TaskBodyProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-body-md min-w-0 truncate font-medium">{task.title}</p>
        <TaskOverdueBadge overdue={overdue} />
      </div>
      <div className="text-caption flex items-center justify-between gap-2 text-ink-muted">
        <span className="min-w-0 truncate">{task.client_name}</span>
        <span className="shrink-0 whitespace-nowrap tabular-nums">{due}</span>
      </div>
    </div>
  );
}

export const LEDGER: CardVariant = {
  Body: LedgerBody,
  TaskBody: LedgerTaskBody,
  cardClassName: "p-3",
};

export function LedgerToday({ leads, tasks }: { leads?: Lead[]; tasks?: TaskDue[] }) {
  return <TodayComp variant={LEDGER} leads={leads} tasks={tasks} />;
}
