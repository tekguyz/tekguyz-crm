import { IconMail, IconMapPin, IconMessage, IconPhone, IconStarFilled, IconX } from "@tabler/icons-react";

import type { Lead } from "@/lib/leads/queries";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

// The panel header, wired. One row: avatar, name (+ starred), company, the
// four Click-to-Action shortcuts, close.
//
// The shipped header this replaces was a p-6 block carrying a name, a company
// and a close button — about 96px of a panel whose whole problem was that its
// content did not fit. Putting the quick actions on the same line is what the
// Stage 1 pick bought back.
//
// The four links are real <a> elements because tel:, sms:, mailto: and the
// Maps deep link are protocol hrefs and a <button> cannot carry one. They go
// through Button's own `asChild` rather than a hand-copied class string:
// CLAUDE.md § UI/UX Design System is explicit that restating a primitive's
// classes in a caller creates a copy that drifts silently. Contacts'
// ContactCard still hand-maintains its copy, documented there as predating
// `asChild`; this is not a second one.
//
// Icon-only, so each <a> needs its own accessible name — aria-label carries
// it and `title` gives a mouse user the same word on hover.
function QuickActions({ lead }: { lead: Lead }) {
  const mapQuery = lead.physical_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.physical_address)}`
    : null;

  return (
    <div className="flex shrink-0 items-center gap-1">
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
          <a href={mapQuery} target="_blank" rel="noopener noreferrer" aria-label="Map" title="Map">
            <IconMapPin stroke={1.75} aria-hidden className="size-4" />
          </a>
        </Button>
      ) : null}
    </div>
  );
}

export function LeadPanelHeader({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-hairline px-4 py-3">
      {/* src/components/ui/Avatar.tsx as shipped, by `name` only. It is not a
          photo and must not become one: there is no column, no bucket and no
          upload path, and Avatar's own comment says the same. Nothing here
          re-implements initials or hashing. */}
      <Avatar name={lead.client_name} size="lg" />

      <div className="min-w-0 flex-1">
        <p className="text-title flex items-center gap-1.5 truncate">
          <span className="truncate">{lead.client_name}</span>
          {lead.is_starred ? (
            // Starred is a real leads column, not decoration, and --accent is
            // not spent on it: --accent in this panel belongs to the primary
            // CTA, active nav and the focus ring. role="img" is not redundant
            // beside aria-label — an <svg> has no implicit role in several
            // engines, and an aria-label on a roleless element is not
            // guaranteed to be announced at all.
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

      <QuickActions lead={lead} />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClose}
        aria-label="Close"
        className="size-7 shrink-0 px-0"
      >
        <IconX stroke={1.75} aria-hidden className="size-4" />
      </Button>
    </div>
  );
}
