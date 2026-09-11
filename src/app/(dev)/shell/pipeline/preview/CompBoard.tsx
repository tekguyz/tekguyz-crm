"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { MembersProvider } from "@/components/shell/MembersContext";
import type { Lead } from "@/lib/leads/queries";
import {
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  groupLeadsByStatus,
  type PipelineStatus,
} from "@/lib/leads/pipeline";
import { CompCard, type CardVariant } from "@/app/(dev)/shell/pipeline/preview/CompCard";
import {
  COLUMN_CARD_CAP,
  MOCK_MEMBERS,
  MOCK_PIPELINE_LEADS,
} from "@/app/(dev)/shell/pipeline/preview/mock-pipeline";

// The board all three variants render on. Identical for all three — only the
// card Body differs — so the one overflow affordance below is built exactly
// once and cannot drift between them.
//
// ORDERING IS THE REAL ONE. groupLeadsByStatus is the shipped adapter from
// lib/leads/pipeline.ts (overdue → starred → revenue → soonest), imported, not
// restated, so the first ten cards here are the same ten the shipped board
// would rank first.
//
// The column chrome restates KanbanColumn's classes rather than rendering it,
// because KanbanColumn hard-wires KanbanCard and its drag handlers. Stage 2
// folds the overflow control into KanbanColumn itself; this copy dies then.
//
// MembersProvider with mock members: AssigneeLabel — the shipped assignee
// rendering, reused as-is — reads the org's members from context and throws
// without a provider.
export function CompBoard({
  variant,
  statuses = PIPELINE_STATUSES,
}: {
  variant: CardVariant;
  // The index page's thumbnails show a subset; the full pages show all four.
  statuses?: readonly PipelineStatus[];
}) {
  const columns = groupLeadsByStatus(MOCK_PIPELINE_LEADS);

  return (
    <MembersProvider members={MOCK_MEMBERS}>
      <div data-board="" className="flex h-full gap-4 overflow-x-auto pb-2">
        {statuses.map((status) => (
          <CompColumn key={status} status={status} leads={columns[status]} variant={variant} />
        ))}
      </div>
    </MembersProvider>
  );
}

// THE OVERFLOW AFFORDANCE. First COLUMN_CARD_CAP cards, then a "+N more"
// control that expands the column in place. It toggles back ("Show fewer") so
// expanding is never one-way on a long column.
//
// Secondary, not ghost: ghost's hover is bg-canvas-soft, which is the
// column's own ground, so a ghost button here would have no visible hover and
// no visible edge. Secondary carries the hairline and the canvas-pure ground
// the cards themselves sit on.
function CompColumn({
  status,
  leads,
  variant,
}: {
  status: PipelineStatus;
  leads: Lead[];
  variant: CardVariant;
}) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(0, leads.length - COLUMN_CARD_CAP);
  const shown = expanded ? leads : leads.slice(0, COLUMN_CARD_CAP);
  const label = PIPELINE_STATUS_LABELS[status];

  return (
    <section
      aria-label={`${label} column`}
      className="flex min-w-64 flex-1 flex-col gap-3 rounded-lg border border-hairline bg-canvas-soft p-3"
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-title">{label}</h2>
        <span className="text-body-sm text-ink-muted">{leads.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {shown.map((lead) => (
          <CompCard key={lead.id} lead={lead} variant={variant} />
        ))}
      </div>

      {hiddenCount > 0 ? (
        <Button
          variant="secondary"
          size="sm"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className="w-full justify-center"
        >
          {expanded ? "Show fewer" : `+${hiddenCount} more`}
        </Button>
      ) : null}
    </section>
  );
}
