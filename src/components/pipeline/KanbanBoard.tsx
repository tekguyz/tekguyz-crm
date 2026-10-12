"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CreateLeadSheet } from "@/components/leads/CreateLeadDrawer";
import { KanbanColumn } from "@/components/pipeline/KanbanColumn";
import { updateLeadStatus } from "@/lib/leads/actions";
import type { Lead } from "@/lib/leads/queries";
import {
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  groupLeadsByStatus,
  type PipelineStatus,
} from "@/lib/leads/pipeline";

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
  // The lane whose "+ New" is open, if any. One create sheet serves all four.
  const [addingIn, setAddingIn] = useState<PipelineStatus | null>(null);
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
        // The card snapping back is not enough on its own: nothing said the
        // move had failed, or why the card was where it was before.
        toast.error(
          `Couldn't move ${lead.client_name} to ${PIPELINE_STATUS_LABELS[targetStatus]}. It is back in ${PIPELINE_STATUS_LABELS[previousStatus as PipelineStatus] ?? previousStatus}.`,
        );
      }
    });
  }

  return (
    <>
      <div className="flex h-full gap-2 overflow-x-auto pb-2">
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
            onAdd={setAddingIn}
          />
        ))}
      </div>
      <CreateLeadSheet
        open={addingIn !== null}
        onOpenChange={(next) => {
          if (!next) setAddingIn(null);
        }}
        status={addingIn ?? undefined}
      />
    </>
  );
}
