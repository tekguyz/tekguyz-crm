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

// VARIANT BRIEF - three rows, money first.
//
// THE THESIS: you scan this page by VALUE. The revenue is promoted out of the
// meta line onto the top row, right-aligned in the same weight as the name, so
// a lane reads as a column of numbers you can compare down. That costs a row,
// and the row is spent deliberately: the company gets a line of its own beside
// the date instead of fighting revenue for the same strip, and the stage pills
// move to a footer row where they are a property of the card rather than the
// first thing in it.
//
// THE COST, MEASURED, NOT ESTIMATED. The content box is the same width Ledger
// gets, but the values are spread over three rows, so the company and the name
// both keep far more of it. The price is height per card, which is what
// decides how much of the page is above the fold. The real numbers for both
// are on ../page.tsx, taken from the browser.
//
// The same field set as Ledger, in the same order of importance. Nothing is
// added and nothing is dropped; only the arrangement changes.
function BriefBody({ lead, cold, revenue, due }: CardBodyProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <StarMark starred={lead.is_starred} cold={cold} />
          <p className="text-body-md truncate font-medium">{lead.client_name}</p>
        </div>
        {/* The promotion that defines this variant: revenue in the name's own
            weight, right-aligned and tabular so the column compares. */}
        <p className="text-body-md shrink-0 font-medium tabular-nums">{revenue}</p>
      </div>

      <div className="text-body-sm flex items-center justify-between gap-2 text-ink-muted">
        <span className="min-w-0 truncate">{lead.company ?? ""}</span>
        <span className="shrink-0 whitespace-nowrap tabular-nums">{due}</span>
      </div>

      {/* The footer row. Left-aligned and on its own, so the two pills never
          compete with the name for the top row's width - which is the width
          Ledger has to spend there. */}
      <div className="flex items-center gap-1">
        <StageBadge lead={lead} />
        <ColdBadge cold={cold} />
      </div>
    </div>
  );
}

// The task card at Brief's density. Same promotion: the due date moves to the
// top row beside the title. The shipped rule is kept - an overdue TASK gets
// the decorative orange pill, never the Going Cold treatment.
function BriefTaskBody({ task, overdue, due }: TaskBodyProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-body-md min-w-0 truncate font-medium">{task.title}</p>
        <span className="text-body-md shrink-0 whitespace-nowrap tabular-nums text-ink-muted">
          {due}
        </span>
      </div>
      <div className="text-body-sm flex items-center justify-between gap-2 text-ink-muted">
        <span className="min-w-0 truncate">{task.client_name}</span>
        <TaskOverdueBadge overdue={overdue} />
      </div>
    </div>
  );
}

export const BRIEF: CardVariant = {
  Body: BriefBody,
  TaskBody: BriefTaskBody,
  cardClassName: "p-3",
};

export function BriefToday({ leads, tasks }: { leads?: Lead[]; tasks?: TaskDue[] }) {
  return <TodayComp variant={BRIEF} leads={leads} tasks={tasks} />;
}
