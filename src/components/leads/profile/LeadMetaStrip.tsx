import { IconCalendarEvent, IconCurrencyDollar, IconFlag, IconUserCircle } from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

import type { Lead } from "@/lib/leads/queries";
import { AssigneeLabel } from "@/components/leads/AssigneeLabel";
import { formatCurrency, formatDueAt, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils/cn";

// One labelled value: a small icon and sentence-case label above, the value
// below. The icon is decoration, the label is the name.
function Cell({
  icon: CellIcon,
  label,
  className,
  wrap = false,
  children,
}: {
  icon: Icon;
  label: string;
  className?: string;
  // Let a long value take up to two lines instead of cutting it with an
  // ellipsis (a lead source such as "Website Contact Form" is a key fact).
  wrap?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 border-hairline px-4 py-2", className)}>
      <dt className="text-label flex items-center gap-1 text-ink-muted">
        <CellIcon aria-hidden stroke={1.75} className="size-3.5 shrink-0" />
        {label}
      </dt>
      <dd className={cn("text-body-md mt-1 min-w-0", wrap ? "line-clamp-2 break-words" : "truncate")}>
        {children}
      </dd>
    </div>
  );
}

// The 4-up label/value strip under the header, wired.
//
// The stage and the relative due label ("3d overdue") moved up into the header,
// where they are pinned and answer "where is this lead, what is next" first.
// What is left here is the detail behind them: the exact follow-up time, the
// value, the source and the owner.
//
// Every field is a REAL column on public.leads — next_action_at,
// estimated_revenue, lead_source, assigned_to — checked against LEAD_COLUMNS in
// src/lib/leads/queries.ts rather than guessed. The reference design this came
// from carried loan-shaped fields (Lead owner / Location / Referral Partner /
// Annual Income); the ones with no column here are absent rather than invented.
//
// An overdue follow-up reads in --danger, the Going Cold signal, and is never
// greyed out. The border and the red text are the only thing that changes with
// the data.
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
      <Cell
        icon={IconCalendarEvent}
        label="Follow-up"
        className="border-b max-sm:border-r sm:border-r sm:border-b-0"
      >
        <span className={cn(overdue ? "font-medium text-danger" : "text-ink-main")}>
          {formatDueAt(lead.next_action_at, timeZone)}
        </span>
      </Cell>

      <Cell icon={IconCurrencyDollar} label="Est. value" className="border-b sm:border-r sm:border-b-0">
        <span className="tabular-nums">{formatCurrency(lead.estimated_revenue, currencyFormat)}</span>
      </Cell>

      <Cell icon={IconFlag} label="Source" wrap className="max-sm:border-r sm:border-r">
        <span className="text-ink-main">{lead.lead_source ?? "—"}</span>
      </Cell>

      <Cell icon={IconUserCircle} label="Owner">
        <AssigneeLabel assignedTo={lead.assigned_to} avatar />
      </Cell>
    </dl>
  );
}
