"use client";

import { useState } from "react";
import { isOverdue, formatDueAt, formatCurrency } from "@/lib/format";
import type { Lead } from "@/lib/leads/queries";
import { EditLeadModal } from "@/components/leads/EditLeadModal";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

const STATUS_TONE: Record<string, BadgeTone> = {
  NEW: "sky",
  DISCOVERY: "purple",
  QUOTED: "orange",
  ACTIVE: "green",
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

  return (
    <>
      {/* The native <button> is kept as an outer wrapper rather than moving to
          Card + role="button": Card renders a <div>, and swapping a real button
          for a div would be an accessibility downgrade the v2 rollout has no
          reason to spend. The wrapper carries layout only, no design tokens. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full text-left"
      >
        {/* Going Cold: `cold` is the same dashed --cold border the hand-rolled
            ternary drew. v1's hover shadow is gone because v2 cards are Level 0
            — a canvas-soft wash carries the hover affordance instead. */}
        <Card cold={overdue} className="p-3 transition-colors hover:bg-canvas-soft">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-body-md truncate font-medium">{lead.client_name}</p>
              {lead.company && (
                <p className="text-body-sm truncate text-ink-muted">{lead.company}</p>
              )}
            </div>
            {/* The overdue badge stays on the neutral tone, which is the exact
                token pair the v1 treatment used. Badge's own `cold` tone puts
                --cold on --canvas-soft, measured at 2.72:1 light / 2.35:1 dark
                — below WCAG AA for an 11px label, so it would have made a
                business signal harder to read. Logged in KNOWN_GAPS. */}
            <Badge
              tone={overdue ? "neutral" : (STATUS_TONE[lead.status] ?? "sky")}
              className="shrink-0 rounded-full px-2"
            >
              {lead.status}
            </Badge>
          </div>
          <div className="text-body-sm mt-2 flex items-center justify-between text-ink-muted">
            <span>{formatCurrency(lead.estimated_revenue, currencyFormat)}</span>
            <span>{formatDueAt(lead.next_action_at, orgTimezone)}</span>
          </div>
        </Card>
      </button>

      <EditLeadModal lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
