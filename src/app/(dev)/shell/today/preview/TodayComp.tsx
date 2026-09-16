"use client";

import type { Lead } from "@/lib/leads/queries";
import type { TaskDue } from "@/lib/tasks/queries";
import { LeadLane, TaskLane } from "@/app/(dev)/shell/today/preview/CompLane";
import type { CardVariant } from "@/app/(dev)/shell/today/preview/CompCard";
import {
  MOCK_TASKS_DUE,
  MOCK_TODAY_LEADS,
  deriveLanes,
} from "@/app/(dev)/shell/today/preview/mock-today";

// THE PAGE COMPOSITION BOTH VARIANTS SHARE. Only the card Body differs, so the
// arrangement of the four sections cannot drift between them.
//
// The shipped TodayAgenda's shape is kept: Tasks Due full-width above a
// three-column lead grid. That arrangement was a deliberate decision (Tasks
// Due is org-wide and cross-cutting, not a fourth pipeline slice) and this
// prompt is not re-opening it. What changes is what Tasks Due IS inside that
// band — a four-across card grid instead of six full-width near-empty rows.
//
// A FIFTH SECTION EXISTS AND IS NOT RESTYLED HERE. The real page renders
// NeedsReviewQueue above Tasks Due — the Spam Shield's review surface, which
// the permanent rule in CLAUDE.md requires to stay a routing destination. It
// self-hides when empty, which is its state in both the demo and the live org,
// so it is absent from these comps. The prompt scopes four sections; treating
// the fifth would be scope creep, but it is flagged on the index page so the
// pick is made knowing the band above Tasks Due can appear.

export function TodayComp({
  variant,
  leads = MOCK_TODAY_LEADS,
  tasks = MOCK_TASKS_DUE,
}: {
  variant: CardVariant;
  // Overridable so the index page's thumbnails and the empty-org proof can
  // render the same components against different data, never a second copy.
  leads?: Lead[];
  tasks?: TaskDue[];
}) {
  const lanes = deriveLanes(leads);

  return (
    <div className="flex flex-col gap-5">
      <TaskLane tasks={tasks} variant={variant} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <LeadLane
          title="SLA Critical"
          emptyCopy="Nothing overdue."
          leads={lanes.sla}
          variant={variant}
        />
        <LeadLane
          title="High-Value"
          emptyCopy="No active leads yet."
          leads={lanes.highValue}
          variant={variant}
        />
        <LeadLane
          title="Starred"
          emptyCopy="No starred accounts."
          leads={lanes.starred}
          variant={variant}
        />
      </div>
    </div>
  );
}
