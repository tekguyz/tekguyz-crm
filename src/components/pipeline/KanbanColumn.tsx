"use client";

import { useState } from "react";
import { KanbanCard } from "@/components/pipeline/KanbanCard";
import type { Lead } from "@/lib/leads/queries";
import { StageBadge } from "@/components/leads/StageBadge";
import { LaneAddButton } from "@/components/pipeline/LaneAddButton";
import type { PipelineStatus } from "@/lib/leads/pipeline";
import { cn } from "@/lib/utils/cn";

export function KanbanColumn({
  status,
  leads,
  orgTimezone,
  currencyFormat,
  draggingLeadId,
  onDragStart,
  onDragEnd,
  onDrop,
  onAdd,
}: {
  status: PipelineStatus;
  leads: Lead[];
  orgTimezone: string;
  currencyFormat: string;
  draggingLeadId: string | null;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  onDrop: (leadId: string, status: PipelineStatus) => void;
  onAdd: (status: PipelineStatus) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const leadId = e.dataTransfer.getData("text/plain");
        if (leadId) onDrop(leadId, status);
      }}
      // NO BOX. A lane used to be a bordered, tinted, full-height panel, which
      // left 280-440px of framed emptiness under the cards of every short lane.
      // It is still a full-height drop target (this element is what the drag
      // handlers sit on), but its frame is transparent until a card is being
      // dragged: then every lane shows a dashed outline, and the one under the
      // pointer takes the accent.
      className={cn(
        "flex min-w-64 flex-1 flex-col gap-2 rounded-lg border p-2 transition-colors",
        isOver
          ? "border-accent bg-canvas-soft"
          : draggingLeadId
            ? "border-dashed border-hairline"
            : "border-transparent",
      )}
    >
      <div className="flex items-center gap-2 px-1">
        {/* The stage's own colour, same pill as everywhere else — the column
            header is where a board is scanned from. The count sits against the
            pill it counts, not at the far edge of the lane. */}
        <h2 className="text-title">
          <StageBadge status={status} className="text-body-sm px-2 py-0.5" />
        </h2>
        <span className="text-body-sm text-ink-muted tabular-nums">{leads.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {leads.length === 0 ? (
          <p className="text-body-sm px-1 text-ink-muted">No leads</p>
        ) : (
          leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              orgTimezone={orgTimezone}
              currencyFormat={currencyFormat}
              dragging={draggingLeadId === lead.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
        <LaneAddButton status={status} onAdd={onAdd} />
      </div>
    </section>
  );
}
