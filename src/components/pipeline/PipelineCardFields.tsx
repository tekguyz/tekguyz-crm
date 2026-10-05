"use client";

import { IconStar } from "@tabler/icons-react";
import { formatCurrency } from "@/lib/format";
import type { Lead } from "@/lib/leads/queries";
import { AssigneeLabel } from "@/components/leads/AssigneeLabel";
import { DueLabel } from "@/components/leads/DueLabel";
import { Avatar } from "@/components/ui/Avatar";

// THE ONE FIELD BLOCK both pipeline cards render — Variant Grouped, picked
// 2026-09-11 in Shell/IA Stage 1 prompt 3. KanbanCard and FocusListCard each
// used to carry an identical hand-written copy; card-fields.test.ts fails if
// either grows one back.
//
// Two rows. A header row carries what a column is scanned for (who, and how
// much); everything else is one muted meta line underneath. No status badge:
// the Kanban column already says the status, and FocusListCard has its own
// select for it.
//
// The meta line holds up to three values in ~217px (measured, 1440x800). The
// date never shrinks — a clipped date is worse than anything else clipped. The
// assignee keeps its natural width up to a 4.5rem cap and truncates past it;
// the company takes what is left. Two drafts without that cap measured a real
// field at 1px and 24px, so do not "simplify" it away. The cost is accepted and
// not hidden: on an assigned lead the company truncates.
//
// A missing company or assignee drops out with its separator, so a sparse lead
// reads "Sep 14, 2:00 PM" rather than " · Sep 14, 2:00 PM · ".
//
// 2026-10-05: an initials avatar leads the name row, and the date is DueLabel
// ("3d overdue" in red), so a late lead is named as late instead of being
// greyed out. The star keeps its colour on a cold card for the same reason.
// `cold` is still accepted from the cards but no longer changes this block.
export function PipelineCardFields({
  lead,
  orgTimezone,
  currencyFormat,
}: {
  lead: Lead;
  cold?: boolean;
  orgTimezone: string;
  currencyFormat: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={lead.client_name} size="sm" />
          <p className="text-body-md truncate font-medium">{lead.client_name}</p>
          {lead.is_starred && (
            <IconStar
              role="img"
              aria-label="Starred"
              stroke={1.75}
              className="-ml-1 size-3.5 shrink-0 fill-pill-orange-fg text-pill-orange-fg"
            />
          )}
        </div>
        <p className="text-body-md shrink-0 font-medium tabular-nums">
          {formatCurrency(lead.estimated_revenue, currencyFormat)}
        </p>
      </div>

      <div className="text-caption flex min-w-0 items-center gap-1.5 text-ink-muted">
        {lead.company ? (
          <>
            <span className="truncate">{lead.company}</span>
            <span aria-hidden="true">·</span>
          </>
        ) : null}
        <DueLabel at={lead.next_action_at} timeZone={orgTimezone} className="text-caption" />
        {lead.assigned_to ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="flex max-w-18 min-w-0 shrink-0">
              <AssigneeLabel assignedTo={lead.assigned_to} />
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
