"use client";

import { useState } from "react";
import { isOverdue, formatDueAt, formatCurrency } from "@/lib/format";
import type { Lead } from "@/lib/leads/queries";
import { EditLeadModal } from "@/components/leads/EditLeadModal";

const STATUS_PILL: Record<string, { bg: string; fg: string }> = {
  NEW: { bg: "bg-pill-sky-bg", fg: "text-pill-sky-fg" },
  DISCOVERY: { bg: "bg-pill-purple-bg", fg: "text-pill-purple-fg" },
  QUOTED: { bg: "bg-pill-orange-bg", fg: "text-pill-orange-fg" },
  ACTIVE: { bg: "bg-pill-green-bg", fg: "text-pill-green-fg" },
};

export function LeadCard({
  lead,
  orgTimezone,
  currencyFormat,
}: {
  lead: Lead;
  orgTimezone: string;
  currencyFormat: string;
}) {
  const [open, setOpen] = useState(false);
  const overdue = isOverdue(lead.next_action_at);
  const pill = STATUS_PILL[lead.status] ?? STATUS_PILL.NEW;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full rounded-lg border bg-canvas-pure p-3 text-left shadow-elevation-1 transition-shadow hover:shadow-elevation-2 ${
          overdue ? "border-dashed border-cold" : "border-hairline"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{lead.client_name}</p>
            {lead.company && (
              <p className="truncate text-xs text-ink-muted">{lead.company}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              overdue
                ? "grayscale bg-canvas-soft text-ink-muted"
                : `${pill.bg} ${pill.fg}`
            }`}
          >
            {lead.status}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
          <span>{formatCurrency(lead.estimated_revenue, currencyFormat)}</span>
          <span>{formatDueAt(lead.next_action_at, orgTimezone)}</span>
        </div>
      </button>

      <EditLeadModal lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
