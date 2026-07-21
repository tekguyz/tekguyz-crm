"use client";

import { useState, useTransition } from "react";
import { FocusListCard } from "@/components/pipeline/FocusListCard";
import { updateLeadStatus } from "@/lib/leads/actions";
import type { Lead } from "@/lib/leads/queries";
import {
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  groupLeadsByStatus,
  type PipelineStatus,
} from "@/lib/leads/pipeline";

export function FocusList({
  leads,
  orgTimezone,
  currencyFormat,
}: {
  leads: Lead[];
  orgTimezone: string;
  currencyFormat: string;
}) {
  const [focusLeads, setFocusLeads] = useState(leads);
  const [, startTransition] = useTransition();

  const groups = groupLeadsByStatus(focusLeads);

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
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {PIPELINE_STATUSES.map((status) => (
        <section key={status} className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">{PIPELINE_STATUS_LABELS[status]}</h2>
            <span className="text-xs text-ink-muted">{groups[status].length}</span>
          </div>

          {groups[status].length === 0 ? (
            <p className="rounded-md border border-dashed border-hairline p-3 text-center text-xs text-ink-muted">
              No leads
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {groups[status].map((lead) => (
                <FocusListCard
                  key={lead.id}
                  lead={lead}
                  orgTimezone={orgTimezone}
                  currencyFormat={currencyFormat}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
