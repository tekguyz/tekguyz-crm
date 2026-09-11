"use client";

import { AssigneeLabel } from "@/components/leads/AssigneeLabel";
import { CompBoard } from "@/app/(dev)/shell/pipeline/preview/CompBoard";
import { StarMark, type CardBodyProps, type CardVariant } from "@/app/(dev)/shell/pipeline/preview/CompCard";

// VARIANT LINE — one field per line, tight leading. Every value gets its own
// row, so nothing ever competes for width, and a missing company or assignee
// simply removes its row rather than leaving a gap.
function LineBody({ lead, cold, revenue, due }: CardBodyProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-body-md truncate font-medium">{lead.client_name}</p>
        <StarMark starred={lead.is_starred} cold={cold} />
      </div>
      {lead.company ? <p className="text-body-sm truncate text-ink-muted">{lead.company}</p> : null}
      <p className="text-body-sm tabular-nums">{revenue}</p>
      <p className="text-body-sm text-ink-muted">{due}</p>
      <AssigneeLabel assignedTo={lead.assigned_to} />
    </div>
  );
}

const LINE: CardVariant = { Body: LineBody, cardClassName: "px-3 py-2" };

// A client wrapper, because a Server Component page cannot hand a component
// (a function) to the client CompBoard as a prop.
export function LineBoard({ statuses }: { statuses?: Parameters<typeof CompBoard>[0]["statuses"] }) {
  return <CompBoard variant={LINE} statuses={statuses} />;
}
