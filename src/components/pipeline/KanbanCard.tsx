"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { isOverdue, formatDueAt, formatCurrency } from "@/lib/format";
import type { Lead } from "@/lib/leads/queries";
import { EditLeadModal } from "@/components/leads/EditLeadModal";

export function KanbanCard({
  lead,
  orgTimezone,
  currencyFormat,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead;
  orgTimezone: string;
  currencyFormat: string;
  dragging: boolean;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
}) {
  const [open, setOpen] = useState(false);
  const overdue = isOverdue(lead.next_action_at);

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", lead.id);
          e.dataTransfer.effectAllowed = "move";
          onDragStart(lead.id);
        }}
        onDragEnd={onDragEnd}
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
        className={`w-full cursor-grab rounded-lg border bg-canvas-pure p-3 text-left shadow-elevation-1 transition-shadow hover:shadow-elevation-2 active:cursor-grabbing ${
          overdue ? "border-dashed border-cold" : "border-hairline"
        } ${dragging ? "opacity-40" : ""}`}
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
      </div>

      <EditLeadModal lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
