"use client";

import { AssigneeLabel } from "@/components/leads/AssigneeLabel";
import { CompBoard } from "@/app/(dev)/shell/pipeline/preview/CompBoard";
import { StarMark, type CardBodyProps, type CardVariant } from "@/app/(dev)/shell/pipeline/preview/CompCard";

// VARIANT SPLIT — who on the left, numbers on the right. Identity (name, star,
// company) takes the flexible column and truncates; the metrics column sizes to
// its content and right-aligns, so revenue and dates line up down the column
// like a ledger.
//
// The metric column is `auto`, not a fixed width: its widest value is a date
// like "Sep 14, 2:00 PM", and a fixed track would either clip that or waste
// width on every card showing a shorter one.
function SplitBody({ lead, cold, revenue, due }: CardBodyProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="text-body-md truncate font-medium">{lead.client_name}</p>
          <StarMark starred={lead.is_starred} cold={cold} />
        </div>
        {lead.company ? <p className="text-body-sm truncate text-ink-muted">{lead.company}</p> : null}
      </div>

      <div className="flex flex-col items-end gap-0.5 text-right">
        <p className="text-body-md font-medium tabular-nums">{revenue}</p>
        <p className="text-caption whitespace-nowrap text-ink-muted">{due}</p>
        <AssigneeLabel assignedTo={lead.assigned_to} />
      </div>
    </div>
  );
}

const SPLIT: CardVariant = { Body: SplitBody, cardClassName: "p-3" };

export function SplitBoard({ statuses }: { statuses?: Parameters<typeof CompBoard>[0]["statuses"] }) {
  return <CompBoard variant={SPLIT} statuses={statuses} />;
}
