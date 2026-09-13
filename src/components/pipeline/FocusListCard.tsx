"use client";

import { useState } from "react";
import { isOverdue } from "@/lib/format";
import type { Lead } from "@/lib/leads/queries";
import { PIPELINE_STATUSES, PIPELINE_STATUS_LABELS, type PipelineStatus } from "@/lib/leads/pipeline";
import { EditLeadDrawer } from "@/components/leads/EditLeadDrawer";
import { PipelineCardFields } from "@/components/pipeline/PipelineCardFields";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";

// No drag surface on touch — the status <select> is the mobile equivalent of
// a cross-column Kanban drop. Selecting the lead's own current status is a
// no-op (the browser doesn't even fire onChange), so this can never persist
// a manual order either, same invariant as the Kanban Reorder Rule.
export function FocusListCard({
  lead,
  orgTimezone,
  currencyFormat,
  onStatusChange,
}: {
  lead: Lead;
  orgTimezone: string;
  currencyFormat: string;
  onStatusChange: (leadId: string, status: PipelineStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const overdue = isOverdue(lead.next_action_at);

  return (
    <>
      <Card
        cold={overdue}
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
        className="w-full cursor-pointer p-3 text-left transition-colors hover:bg-canvas-soft"
      >
        {/* The same two Grouped rows KanbanCard renders — this is that card's
            mobile twin, so the two must never show different fields. */}
        <PipelineCardFields
          lead={lead}
          cold={overdue}
          orgTimezone={orgTimezone}
          currencyFormat={currencyFormat}
        />

        {/* Row three, FocusListCard only. Grouped has no status badge because
            a Kanban column already says the status; this list has no drag, so
            the select is the only way to change status here and needs a row
            of its own. Still name-less and still controlled: it drives a
            Server Action argument directly, never a form post, so there is no
            formData key for it to silently drop. */}
        <div className="mt-2">
          <Select
            aria-label={`Status for ${lead.client_name}`}
            value={lead.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onStatusChange(lead.id, e.target.value as PipelineStatus);
            }}
            className="text-body-sm"
          >
            {PIPELINE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PIPELINE_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <EditLeadDrawer lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
