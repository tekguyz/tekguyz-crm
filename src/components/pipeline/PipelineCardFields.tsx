"use client";

import { IconBuilding, IconStar } from "@tabler/icons-react";
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
// Up to three rows. A header row carries what a column is scanned for (who,
// and how much); under it the company (icon, its own line), then the due date
// and the owner. No status badge: the Kanban column already says the status,
// and FocusListCard has its own select for it.
//
// The company took its own line in #47 step 3. It used to share one muted line
// with the date and the owner in ~217px, and the assignee cap that squeezed it
// was a patch on that: 6 of 16 company names still clipped. The date still
// never shrinks (a clipped date is worse than anything else clipped), and the
// owner now takes whatever the date leaves.
//
// A missing company or assignee drops out with its row or separator, so a
// sparse lead reads as a name, an amount and a date.
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

      {/* The company has its own line and an icon, like the due date and the
          owner below it. Sharing one line with them clipped it: 6 of 16
          company names were cut off at 1440. */}
      {lead.company ? (
        <p className="text-caption flex min-w-0 items-center gap-1 text-ink-muted">
          <IconBuilding aria-hidden stroke={1.75} className="size-3.5 shrink-0" />
          <span className="truncate">{lead.company}</span>
        </p>
      ) : null}

      <div className="text-caption flex min-w-0 items-center gap-1.5 text-ink-muted">
        <DueLabel at={lead.next_action_at} timeZone={orgTimezone} className="text-caption" />
        {lead.assigned_to ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="flex min-w-0 shrink">
              <AssigneeLabel assignedTo={lead.assigned_to} />
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
