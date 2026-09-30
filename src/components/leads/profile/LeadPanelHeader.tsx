import { IconPencil, IconStarFilled, IconX } from "@tabler/icons-react";

import { channelLinks } from "@/lib/leads/channel-links";
import type { Lead } from "@/lib/leads/queries";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ChannelIcon } from "@/components/leads/ChannelIcon";

// The panel header, wired. Row one: avatar, name (+ starred), company, edit,
// close. Row two: the Click-to-Action shortcuts, one per channel the lead has.
//
// The shortcuts sat on row one while there were at most four (call, text,
// email, map). A Lead Pack lead can have nine (#37): call, text, email,
// WhatsApp, website, Facebook, Instagram, Google and map. Nine 28px icons on
// the name's row would squeeze the name to nothing, so they have their own
// row, wrapping, indented under the name. A channel the lead lacks gives no
// icon, and a lead with none gives no row.
//
// The links are real <a> elements because tel:, sms:, mailto: and web links
// are hrefs and a <button> cannot carry one. They go through Button's own
// `asChild` rather than a hand-copied class string: CLAUDE.md § UI/UX Design
// System is explicit that restating a primitive's classes in a caller creates
// a copy that drifts silently. Contacts' ContactCard does the same.
//
// Icon-only, so each <a> needs its own accessible name — aria-label carries
// it and `title` gives a mouse user the same word on hover.
function QuickActions({ lead }: { lead: Lead }) {
  const links = channelLinks(lead);
  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 pl-[3.25rem]">
      {links.map((link) => (
        <Button key={link.kind} asChild variant="secondary" size="sm" className="size-7 px-0">
          <a
            href={link.href}
            aria-label={link.label}
            title={link.label}
            {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <ChannelIcon kind={link.kind} className="size-4" />
          </a>
        </Button>
      ))}
    </div>
  );
}

// `onEdit` is the read panel's way INTO the edit drawer (added 2026-09-13 with
// the Quiet shell wiring). It does not open anything itself: the host that owns
// both views — EditLeadDrawer — switches which one is showing, so there is one
// open-state for the lead surface, not a second path to the drawer. Optional so
// a panel with no such host renders no dead control.
export function LeadPanelHeader({
  lead,
  onClose,
  onEdit,
}: {
  lead: Lead;
  onClose: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-hairline px-4 py-3">
      <div className="flex items-center gap-3">
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

        {onEdit ? (
          // Secondary, not primary: --accent in this panel is not spent on a
          // control that sits beside the secondary shortcuts. The word is
          // visible from `sm` up; on a phone the header row is already carrying
          // an avatar and a name, so the label drops to sr-only and the pencil
          // carries it, with the accessible name intact.
          //
          // "Edit lead", not "Edit": the bare word rendered 21.8px wide, under
          // `npm run check:widths`' 24px floor. It was intact, not squeezed, but
          // the floor is not lowered for one label, and the two-word version is
          // also the clearer name for the one control in this row.
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onEdit}
            className="shrink-0 max-sm:size-7 max-sm:px-0"
          >
            <IconPencil stroke={1.75} aria-hidden className="size-4" />
            <span className="sr-only sm:not-sr-only">Edit lead</span>
          </Button>
        ) : null}

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
      <QuickActions lead={lead} />
    </div>
  );
}
