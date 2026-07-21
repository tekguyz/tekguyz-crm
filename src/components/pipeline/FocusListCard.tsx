"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { isOverdue, formatDueAt, formatCurrency } from "@/lib/format";
import type { Lead } from "@/lib/leads/queries";
import { PIPELINE_STATUSES, PIPELINE_STATUS_LABELS, type PipelineStatus } from "@/lib/leads/pipeline";
import { EditLeadModal } from "@/components/leads/EditLeadModal";

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
      <div
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
        className={`w-full cursor-pointer rounded-lg border bg-canvas-pure p-3 text-left shadow-elevation-1 ${
          overdue ? "border-dashed border-cold" : "border-hairline"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{lead.client_name}</p>
            {lead.company && (
              <p className="truncate text-xs text-ink-muted">{lead.company}</p>
            )}
          </div>
          {lead.is_starred && (
            <Star
              className={`size-4 shrink-0 ${
                overdue ? "fill-ink-muted text-ink-muted" : "fill-pill-orange-fg text-pill-orange-fg"
              }`}
            />
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
          <span>{formatCurrency(lead.estimated_revenue, currencyFormat)}</span>
          <span>{formatDueAt(lead.next_action_at, orgTimezone)}</span>
        </div>

        <select
          value={lead.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onStatusChange(lead.id, e.target.value as PipelineStatus);
          }}
          className="mt-2 w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-xs text-ink-main"
        >
          {PIPELINE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PIPELINE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <EditLeadModal lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
