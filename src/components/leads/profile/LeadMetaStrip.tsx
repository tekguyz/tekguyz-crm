import type { Lead } from "@/lib/leads/queries";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDueAt, isOverdue } from "@/lib/format";
import { STATUS_TONE } from "@/lib/leads/status-tone";

// The 4-up label/value strip under the header, wired.
//
// Every field is a REAL column on public.leads — status, estimated_revenue,
// next_action_at, lead_source — checked against LEAD_COLUMNS in
// src/lib/leads/queries.ts rather than guessed. The reference design this came
// from carried loan-shaped fields (Lead owner / Location / Referral Partner /
// Annual Income); three of the four have no column here at all, so they are
// absent rather than invented.
//
// `timeZone` and `currencyFormat` are the tenant's own display settings,
// resolved once by the panel. They default to UTC/USD only for the moment
// before that resolves — a wrong-looking figure for one frame is better than
// a blank cell, and neither value is ever written anywhere.
export function LeadMetaStrip({
  lead,
  timeZone,
  currencyFormat,
}: {
  lead: Lead;
  timeZone: string;
  currencyFormat: string;
}) {
  const overdue = isOverdue(lead.next_action_at);

  return (
    <dl className="grid shrink-0 grid-cols-2 border-b border-hairline sm:grid-cols-4">
      <div className="min-w-0 border-b border-hairline px-4 py-2 sm:border-r sm:border-b-0">
        <dt className="text-label uppercase text-ink-muted">Stage</dt>
        <dd className="mt-1">
          <Badge tone={STATUS_TONE[lead.status] ?? "neutral"} dot>
            {lead.status}
          </Badge>
        </dd>
      </div>

      <div className="min-w-0 border-b border-hairline px-4 py-2 sm:border-r sm:border-b-0">
        <dt className="text-label uppercase text-ink-muted">Est. value</dt>
        <dd className="text-body-md mt-1 truncate tabular-nums">
          {formatCurrency(lead.estimated_revenue, currencyFormat)}
        </dd>
      </div>

      <div className="min-w-0 border-hairline px-4 py-2 sm:border-r">
        <dt className="text-label uppercase text-ink-muted">Next action</dt>
        {/* The Going Cold SLA rule, in its badge half. Not a new colour and
            not a styling choice — Badge's "cold" tone IS the desaturation the
            rule specifies, and it is the only thing in this strip allowed to
            change appearance based on data. */}
        <dd className="text-body-md mt-1 truncate">
          {overdue ? (
            <Badge tone="cold" dot>
              Overdue
            </Badge>
          ) : (
            <span className="text-ink-main">{formatDueAt(lead.next_action_at, timeZone)}</span>
          )}
        </dd>
      </div>

      <div className="min-w-0 px-4 py-2">
        <dt className="text-label uppercase text-ink-muted">Source</dt>
        <dd className="text-body-md mt-1 truncate text-ink-main">{lead.lead_source ?? "—"}</dd>
      </div>
    </dl>
  );
}
