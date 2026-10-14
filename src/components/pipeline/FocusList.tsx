"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CreateLeadSheet } from "@/components/leads/CreateLeadDrawer";
import { LaneAddButton } from "@/components/pipeline/LaneAddButton";
import { FocusListCard } from "@/components/pipeline/FocusListCard";
import { updateLeadStatus } from "@/lib/leads/actions";
import type { Lead } from "@/lib/leads/queries";
import { StageBadge } from "@/components/leads/StageBadge";
import {
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  groupLeadsByStatus,
  type PipelineStatus,
} from "@/lib/leads/pipeline";
import { leadComparator } from "@/lib/leads/sort";
import type { LeadSortKey, SortDir } from "@/lib/views/params";

export function FocusList({
  leads,
  orgTimezone,
  currencyFormat,
  // Same as KanbanBoard: the Stage filter's lanes and the Sort's order.
  lanes = PIPELINE_STATUSES,
  sort = "priority",
  dir = "asc",
}: {
  leads: Lead[];
  orgTimezone: string;
  currencyFormat: string;
  lanes?: readonly PipelineStatus[];
  sort?: LeadSortKey;
  dir?: SortDir;
}) {
  const [focusLeads, setFocusLeads] = useState(leads);
  const [addingIn, setAddingIn] = useState<PipelineStatus | null>(null);
  const [, startTransition] = useTransition();

  const groups = groupLeadsByStatus(focusLeads, leadComparator(sort, dir));

  function handleStatusChange(leadId: string, targetStatus: PipelineStatus) {
    const lead = focusLeads.find((l) => l.id === leadId);
    if (!lead || lead.status === targetStatus) return;

    const previousStatus = lead.status;
    setFocusLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: targetStatus } : l)),
    );

    startTransition(async () => {
      try {
        await updateLeadStatus(leadId, targetStatus);
      } catch {
        setFocusLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: previousStatus } : l)),
        );
        toast.error(
          `Couldn't move ${lead.client_name} to ${PIPELINE_STATUS_LABELS[targetStatus]}. It is back in ${PIPELINE_STATUS_LABELS[previousStatus as PipelineStatus] ?? previousStatus}.`,
        );
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {lanes.map((status) => (
          <section key={status} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              {/* The stage's own colour, same pill as everywhere else — the column
                  header is where a board is scanned from. */}
              <h2 className="text-title">
                <StageBadge status={status} className="text-body-sm px-2 py-0.5" />
              </h2>
              <span className="text-body-sm text-ink-muted tabular-nums">{groups[status].length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {groups[status].length === 0 ? (
                <p className="text-body-sm px-1 text-ink-muted">No leads</p>
              ) : (
                groups[status].map((lead) => (
                  <FocusListCard
                    key={lead.id}
                    lead={lead}
                    orgTimezone={orgTimezone}
                    currencyFormat={currencyFormat}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
              <LaneAddButton status={status} onAdd={setAddingIn} />
            </div>
          </section>
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
