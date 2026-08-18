"use client";

import { useState } from "react";
import { IconStar } from "@tabler/icons-react";
import { isOverdue, formatDueAt, formatCurrency } from "@/lib/format";
import type { Lead } from "@/lib/leads/queries";
import { PIPELINE_STATUSES, PIPELINE_STATUS_LABELS, type PipelineStatus } from "@/lib/leads/pipeline";
import { EditLeadModal } from "@/components/leads/EditLeadModal";
import { AssigneeLabel } from "@/components/leads/AssigneeLabel";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";

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
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-body-md truncate font-medium">{lead.client_name}</p>
            {lead.company && (
              <p className="text-body-sm truncate text-ink-muted">{lead.company}</p>
            )}
          </div>
          {lead.is_starred && (
            <IconStar
              stroke={1.75}
              className={cn(
                "size-5 shrink-0",
                overdue
                  ? "fill-ink-muted text-ink-muted"
                  : "fill-pill-orange-fg text-pill-orange-fg",
              )}
            />
          )}
        </div>

        <div className="text-body-sm mt-2 flex items-center justify-between text-ink-muted">
          <span>{formatCurrency(lead.estimated_revenue, currencyFormat)}</span>
          <span>{formatDueAt(lead.next_action_at, orgTimezone)}</span>
        </div>

        {/* Same position as on KanbanCard — this is that card's mobile twin,
            and ownership should not appear on one breakpoint only. Renders
            nothing when unassigned. */}
        <AssigneeLabel assignedTo={lead.assigned_to} />

        {/* Still name-less and still controlled: this select drives a Server
            Action argument directly, never a form post, so there is no
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

      <EditLeadModal lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
