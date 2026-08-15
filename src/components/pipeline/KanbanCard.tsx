"use client";

import { useState } from "react";
import { IconStar } from "@tabler/icons-react";
import { isOverdue, formatDueAt, formatCurrency } from "@/lib/format";
import type { Lead } from "@/lib/leads/queries";
import { EditLeadModal } from "@/components/leads/EditLeadModal";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

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
      {/* Card renders a <div> and spreads every prop, so the drag surface,
          the role="button" affordance and the keyboard handler all survive
          the swap untouched. Only the styling moved. */}
      <Card
        cold={overdue}
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
        className={cn(
          "w-full cursor-grab p-3 text-left transition-colors active:cursor-grabbing",
          "hover:bg-canvas-soft",
          dragging && "opacity-40",
        )}
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
      </Card>

      <EditLeadModal lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
