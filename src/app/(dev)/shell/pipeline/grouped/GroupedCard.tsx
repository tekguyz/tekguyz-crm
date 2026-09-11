"use client";

import { AssigneeLabel } from "@/components/leads/AssigneeLabel";
import { CompBoard } from "@/app/(dev)/shell/pipeline/preview/CompBoard";
import { StarMark, type CardBodyProps, type CardVariant } from "@/app/(dev)/shell/pipeline/preview/CompCard";

// VARIANT GROUPED — two rows. A header row carries the two things you scan a
// column for (who, and how much); everything else collapses into one muted
// meta line underneath.
//
// Width is the constraint here: the meta line holds up to three values in
// 217px (measured, 1440x800). The date never shrinks — a clipped date is worse
// than anything else clipped. The assignee keeps its natural width up to a
// 4.5rem cap and truncates past it; the company takes what is left.
//
// Two drafts failed on measurement first. Company-only shrink: beside "Former
// member" the company measured 1px — it vanished. Proportional shrink of both:
// "priya" measured 24px including its icon — the name vanished instead. The
// cap is what guarantees neither goes to zero: the company keeps at least
// ~30px. That is still the cost this variant pays, and it is not hidden — on
// an assigned lead the company is truncated at this column width.
// A missing company or assignee drops out together with its separator, so a
// sparse lead reads "Sep 14, 2:00 PM" rather than " · Sep 14, 2:00 PM · ".
function GroupedBody({ lead, cold, revenue, due }: CardBodyProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="text-body-md truncate font-medium">{lead.client_name}</p>
          <StarMark starred={lead.is_starred} cold={cold} />
        </div>
        <p className="text-body-md shrink-0 font-medium tabular-nums">{revenue}</p>
      </div>

      <div className="text-caption flex min-w-0 items-center gap-1.5 text-ink-muted">
        {lead.company ? (
          <>
            <span className="truncate">{lead.company}</span>
            <span aria-hidden="true">·</span>
          </>
        ) : null}
        <span className="shrink-0 whitespace-nowrap">{due}</span>
        {lead.assigned_to ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="flex max-w-[4.5rem] min-w-0 shrink-0">
              <AssigneeLabel assignedTo={lead.assigned_to} />
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

const GROUPED: CardVariant = { Body: GroupedBody, cardClassName: "p-3" };

export function GroupedBoard({ statuses }: { statuses?: Parameters<typeof CompBoard>[0]["statuses"] }) {
  return <CompBoard variant={GROUPED} statuses={statuses} />;
}
