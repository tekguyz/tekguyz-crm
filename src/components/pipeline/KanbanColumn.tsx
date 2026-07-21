"use client";

import { useState } from "react";
import { KanbanCard } from "@/components/pipeline/KanbanCard";
import type { Lead } from "@/lib/leads/queries";
import { PIPELINE_STATUS_LABELS, type PipelineStatus } from "@/lib/leads/pipeline";

export function KanbanColumn({
  status,
  leads,
  orgTimezone,
  currencyFormat,
  draggingLeadId,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  status: PipelineStatus;
  leads: Lead[];
  orgTimezone: string;
  currencyFormat: string;
  draggingLeadId: string | null;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  onDrop: (leadId: string, status: PipelineStatus) => void;
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
      className={`flex min-w-64 flex-1 flex-col gap-3 rounded-lg border bg-canvas-soft p-3 transition-colors ${
        isOver ? "border-accent" : "border-hairline"
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{PIPELINE_STATUS_LABELS[status]}</h2>
        <span className="text-xs text-ink-muted">{leads.length}</span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {leads.length === 0 ? (
          <p className="rounded-md border border-dashed border-hairline p-3 text-center text-xs text-ink-muted">
            No leads
          </p>
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
      </div>
    </section>
  );
}
