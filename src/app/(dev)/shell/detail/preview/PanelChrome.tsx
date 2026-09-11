import {
  IconMail,
  IconMapPin,
  IconMessage,
  IconPhone,
  IconStarFilled,
  IconX,
} from "@tabler/icons-react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import { MOCK_LEAD } from "@/app/(dev)/shell/detail/preview/mock-lead";

// THE HEADER, WHICH IS HALF OF WHAT THIS PROMPT IS FIXING.
//
// The shipped header (ProfileSheet.tsx) is a p-6 block carrying nothing but a
// name, a company and a close button — roughly 96px of panel spent on two
// lines of text, on a panel whose whole problem is that its content does not
// fit. plancrm-drawer.webp's TAKE line is the fix: put the quick-action icon
// row on the same line as the name, so the row that was empty on the right now
// carries the four things an operator actually does from this panel.
//
// Shared by all four variants unchanged. The variants differ only in section
// navigation; holding the header constant is what makes them comparable.

// Third copy of this map. The other two are STATUS_TONE in
// components/agenda/LeadCard.tsx and STAGE_TONE in components/reports/
// StageLedger.tsx, which already carry "if one map changes, change both".
// NOT consolidated here on purpose: extracting it would mean editing a
// production file, and Stage 1 is comps only. Making it one shared constant is
// Stage 2 work, and it is worth doing then — three copies is one more than the
// comment those two files carry admits to.
const STATUS_TONE: Record<string, BadgeTone> = {
  NEW: "sky",
  DISCOVERY: "purple",
  QUOTED: "orange",
  ACTIVE: "green",
};

// The Click-to-Action Real-Time Shortcuts, via Button's own `asChild`.
//
// Contacts' ContactCard hand-maintains a class string for these, documented
// there as an exception from before `asChild` existed on Button. It does not
// need to be a second time: CLAUDE.md § UI/UX Design System says a control
// that cannot be a <button> — a protocol href is exactly that — reaches for
// asChild and lets the primitive supply the classes. So these four links carry
// zero copied classes, and a change to Button's `secondary`/`sm` tokens
// reaches them for free.
//
// Icon-only, so each <a> needs its own accessible name: aria-label carries it
// and `title` gives a mouse user the same word on hover.
function QuickActions({ className }: { className?: string }) {
  const lead = MOCK_LEAD;
  const mapQuery = lead.physical_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.physical_address)}`
    : null;

  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      {lead.phone ? (
        <>
          <Button asChild variant="secondary" size="sm" className="size-7 px-0">
            <a href={`tel:${lead.phone}`} aria-label="Call" title="Call">
              <IconPhone stroke={1.75} aria-hidden className="size-4" />
            </a>
          </Button>
          <Button asChild variant="secondary" size="sm" className="size-7 px-0">
            <a href={`sms:${lead.phone}`} aria-label="Text" title="Text">
              <IconMessage stroke={1.75} aria-hidden className="size-4" />
            </a>
          </Button>
        </>
      ) : null}
      <Button asChild variant="secondary" size="sm" className="size-7 px-0">
        <a href={`mailto:${lead.email}`} aria-label="Email" title="Email">
          <IconMail stroke={1.75} aria-hidden className="size-4" />
        </a>
      </Button>
      {mapQuery ? (
        <Button asChild variant="secondary" size="sm" className="size-7 px-0">
          <a
            href={mapQuery}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Map"
            title="Map"
          >
            <IconMapPin stroke={1.75} aria-hidden className="size-4" />
          </a>
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Name, company, avatar and the four quick actions in ONE row, plus close.
 *
 * The avatar is src/components/ui/Avatar.tsx as shipped, by `name` only. It is
 * not a photo and must not become one: plancrm-drawer.webp's IGNORE line rules
 * the photo out because there is no column, no bucket and no upload path, and
 * Avatar's own comment says the same. Nothing here re-implements initials or
 * hashing — both come from the primitive.
 */
export function CompactHeader({
  onCloseLabel = "Close",
  className,
}: {
  onCloseLabel?: string;
  className?: string;
}) {
  const lead = MOCK_LEAD;

  return (
    <div className={cn("flex items-center gap-3 border-b border-hairline px-4 py-3", className)}>
      <Avatar name={lead.client_name} size="lg" />

      <div className="min-w-0 flex-1">
        <p className="text-title flex items-center gap-1.5 truncate">
          <span className="truncate">{lead.client_name}</span>
          {lead.is_starred ? (
            // Starred is a real leads column, not decoration. --accent is not
            // spent on it: the ink-muted star is a state marker, and --accent
            // in this panel belongs to the primary CTA and the focus ring.
            // role="img" is not redundant beside aria-label: an <svg> has no
            // implicit role in several engines, and an aria-label on a roleless
            // element is not guaranteed to be announced at all. Every other
            // icon in this file is aria-hidden inside a labelled control; this
            // one carries meaning of its own, so it gets a real role.
            <IconStarFilled
              role="img"
              aria-label="Starred"
              className="size-3.5 shrink-0 text-ink-muted"
            />
          ) : null}
        </p>
        {lead.company ? (
          <p className="text-body-sm truncate text-ink-muted">{lead.company}</p>
        ) : null}
      </div>

      <QuickActions />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={onCloseLabel}
        className="size-7 shrink-0 px-0"
      >
        <IconX stroke={1.75} aria-hidden className="size-4" />
      </Button>
    </div>
  );
}

/**
 * The 4-up label/value strip, straight from plancrm-drawer.webp's TAKE line —
 * except that every field is a REAL column on public.leads, verified against
 * the DDL in docs/SCHEMA_REFERENCE.md and against LEAD_COLUMNS in
 * src/lib/leads/queries.ts, not guessed. The reference's own fields (Lead
 * owner / Location / Referral Partner / Annual Income) are loan-shaped and its
 * IGNORE line rules them out; three of the four have no column here at all.
 *
 * Fields: status, estimated_revenue, next_action_at, lead_source.
 *
 * The loan-progress bar underneath the strip in the reference is NOT taken —
 * same IGNORE line. There is no percentage-complete concept on a lead, and
 * inventing one would be inventing a data model.
 */
export function MetaStrip({ className }: { className?: string }) {
  const lead = MOCK_LEAD;
  const overdue = isOverdue(lead.next_action_at);

  return (
    <dl
      className={cn(
        "grid grid-cols-2 border-b border-hairline sm:grid-cols-4",
        className,
      )}
    >
      <div className="border-b border-hairline px-4 py-2 sm:border-b-0 sm:border-r">
        <dt className="text-label uppercase text-ink-muted">Stage</dt>
        <dd className="mt-1">
          <Badge tone={STATUS_TONE[lead.status] ?? "neutral"} dot>
            {lead.status}
          </Badge>
        </dd>
      </div>

      <div className="border-b border-hairline px-4 py-2 sm:border-b-0 sm:border-r">
        <dt className="text-label uppercase text-ink-muted">Est. value</dt>
        <dd className="text-body-md mt-1 tabular-nums">
          {formatCurrency(lead.estimated_revenue, "USD")}
        </dd>
      </div>

      <div className="border-hairline px-4 py-2 sm:border-r">
        <dt className="text-label uppercase text-ink-muted">Next action</dt>
        {/* The Going Cold SLA rule, in its badge half. Not a new colour and not
            a styling choice — Badge's "cold" tone IS the desaturation the rule
            specifies, and it is the only thing in this strip allowed to change
            appearance based on data. */}
        <dd className="text-body-md mt-1">
          {overdue ? (
            <Badge tone="cold" dot>
              Overdue
            </Badge>
          ) : (
            <span className="text-ink-main">Sep 6, 1:00 PM</span>
          )}
        </dd>
      </div>

      <div className="px-4 py-2">
        <dt className="text-label uppercase text-ink-muted">Source</dt>
        <dd className="text-body-md mt-1 truncate text-ink-main">
          {lead.lead_source ?? "—"}
        </dd>
      </div>
    </dl>
  );
}
