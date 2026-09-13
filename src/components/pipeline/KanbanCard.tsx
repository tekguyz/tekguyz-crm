"use client";

import { useState } from "react";
import { isOverdue } from "@/lib/format";
import type { Lead } from "@/lib/leads/queries";
import { EditLeadDrawer } from "@/components/leads/EditLeadDrawer";
import { PipelineCardFields } from "@/components/pipeline/PipelineCardFields";
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
        <PipelineCardFields
          lead={lead}
          cold={overdue}
          orgTimezone={orgTimezone}
          currencyFormat={currencyFormat}
        />
      </Card>

      <EditLeadDrawer lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
