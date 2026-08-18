"use client";

import { useState } from "react";
import { IconPhone, IconMessage, IconMail, IconMapPin } from "@tabler/icons-react";
import type { ContactLead } from "@/lib/leads/queries";
import { EditLeadModal } from "@/components/leads/EditLeadModal";
import { AssigneeLabel } from "@/components/leads/AssigneeLabel";
import { Card } from "@/components/ui/Card";

// The click-to-action row stays as real <a> elements: tel:, sms:, mailto: and
// the Maps deep link are the Click-to-Action Real-Time Shortcuts, and a
// <button> cannot carry a protocol href. Button renders a <button>, so this is
// a deliberate documented exception to "consume primitives" — the class string
// below is held to Button's own secondary/sm token set so the two read
// identically.
const actionLinkClass =
  "text-body-sm inline-flex h-7 items-center gap-1.5 rounded-md border border-hairline bg-canvas-pure px-2 text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink-main";

export function ContactCard({ lead }: { lead: ContactLead }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* v2 cards are Level 0, so v1's elevation-1 → elevation-2 hover is
          replaced by a canvas-soft wash, same as the agenda lead cards.
          `cold` is deliberately not passed: the Contacts directory is not a
          pipeline view and does not carry the Going Cold SLA signal. */}
      <Card
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
        className="flex cursor-pointer flex-col gap-3 transition-colors hover:bg-canvas-soft"
      >
        <div className="min-w-0">
          <p className="text-body-md truncate font-medium">{lead.client_name}</p>
          {lead.company && (
            <p className="text-body-sm truncate text-ink-muted">{lead.company}</p>
          )}
          {/* Renders nothing when unassigned, so an unowned contact card is
              unchanged from before ownership existed. */}
          <AssigneeLabel assignedTo={lead.assigned_to} />
        </div>

        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          {lead.phone && (
            <>
              <a href={`tel:${lead.phone}`} className={actionLinkClass}>
                <IconPhone stroke={1.75} className="size-3.5" />
                Call
              </a>
              <a href={`sms:${lead.phone}`} className={actionLinkClass}>
                <IconMessage stroke={1.75} className="size-3.5" />
                Text
              </a>
            </>
          )}
          <a href={`mailto:${lead.email}`} className={actionLinkClass}>
            <IconMail stroke={1.75} className="size-3.5" />
            Email
          </a>
          {lead.physical_address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.physical_address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={actionLinkClass}
            >
              <IconMapPin stroke={1.75} className="size-3.5" />
              Map
            </a>
          )}
        </div>
      </Card>

      <EditLeadModal lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
