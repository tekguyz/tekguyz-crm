"use client";

import { useState } from "react";
import { channelLinks } from "@/lib/leads/channel-links";
import type { ContactLead } from "@/lib/leads/queries";
import { ChannelIcon } from "@/components/leads/ChannelIcon";
import { EditLeadDrawer } from "@/components/leads/EditLeadDrawer";
import { AssigneeLabel } from "@/components/leads/AssigneeLabel";
import { Card } from "@/components/ui/Card";

// The click-to-action row stays as real <a> elements: tel:, sms:, mailto:, the
// channel links and the Maps deep link are the Click-to-Action Real-Time
// Shortcuts, and a <button> cannot carry an href. One link per channel the
// lead has, from the same channelLinks() as the profile header (#37). Button renders a <button>, so this is
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
          {lead.company && <p className="text-body-sm truncate text-ink-muted">{lead.company}</p>}
          {/* Renders nothing when unassigned, so an unowned contact card is
              unchanged from before ownership existed. */}
          <AssigneeLabel assignedTo={lead.assigned_to} />
        </div>

        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          {channelLinks(lead).map((link) => (
            <a
              key={link.kind}
              href={link.href}
              className={actionLinkClass}
              {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <ChannelIcon kind={link.kind} className="size-3.5" />
              {link.label}
            </a>
          ))}
        </div>
      </Card>

      <EditLeadDrawer lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
