"use client";

import { useState } from "react";
import { IconStar } from "@tabler/icons-react";
import { formatCurrency } from "@/lib/format";
import type { Lead } from "@/lib/leads/queries";
import { EditLeadDrawer } from "@/components/leads/EditLeadDrawer";
import { StageBadge } from "@/components/leads/StageBadge";
import { DueLabel } from "@/components/leads/DueLabel";
import { Avatar } from "@/components/ui/Avatar";

// One row in a Today queue (AgendaPanel). It was a full Card per lead, which
// made each queue several screens long; a row carries the same fields in a
// third of the height. Going Cold now reads from DueLabel's red "overdue"
// text — the stage pill keeps its colour either way.
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

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-canvas-soft"
      >
        <Avatar name={lead.client_name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-body-md flex items-center gap-1.5 font-medium">
            <span className="truncate">{lead.client_name}</span>
            {lead.is_starred ? (
              <IconStar
                role="img"
                aria-label="Starred"
                stroke={1.75}
                className="size-3.5 shrink-0 fill-pill-orange-fg text-pill-orange-fg"
              />
            ) : null}
          </p>
          {lead.company ? (
            <p className="text-body-sm truncate text-ink-muted">{lead.company}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <div className="flex items-center gap-2">
            <StageBadge status={lead.status} />
            <span className="text-body-md w-16 text-right font-medium tabular-nums">
              {formatCurrency(lead.estimated_revenue, currencyFormat)}
            </span>
          </div>
          <DueLabel at={lead.next_action_at} timeZone={orgTimezone} />
        </div>
      </button>

      <EditLeadDrawer lead={lead} open={open} onClose={() => setOpen(false)} />
    </li>
  );
}
