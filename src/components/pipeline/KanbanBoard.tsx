"use client";

import { useState, useTransition } from "react";
import { KanbanColumn } from "@/components/pipeline/KanbanColumn";
import { updateLeadStatus } from "@/lib/leads/actions";
import type { Lead } from "@/lib/leads/queries";
import { PIPELINE_STATUSES, groupLeadsByStatus, type PipelineStatus } from "@/lib/leads/pipeline";

export function KanbanBoard({
  leads,
  orgTimezone,
  currencyFormat,
}: {
  leads: Lead[];
  orgTimezone: string;
  currencyFormat: string;
}) {
  const [boardLeads, setBoardLeads] = useState(leads);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const columns = groupLeadsByStatus(boardLeads);

  function handleDrop(leadId: string, targetStatus: PipelineStatus) {
    const lead = boardLeads.find((l) => l.id === leadId);
    // Same-column drop: status is unchanged, so this is a no-op by design —
    // there is no order field to write. See the Kanban Reorder Rule in CLAUDE.md.
    if (!lead || lead.status === targetStatus) return;

    const previousStatus = lead.status;
    setBoardLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: targetStatus } : l)),
    );

    startTransition(async () => {
      try {
        await updateLeadStatus(leadId, targetStatus);
      } catch {
        setBoardLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: previousStatus } : l)),
        );
      }
    });
  }

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-2">
      {PIPELINE_STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          leads={columns[status]}
          orgTimezone={orgTimezone}
          currencyFormat={currencyFormat}
          draggingLeadId={draggingLeadId}
          onDragStart={setDraggingLeadId}
          onDragEnd={() => setDraggingLeadId(null)}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
