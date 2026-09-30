"use client";

import { useState } from "react";
import { channelLinks } from "@/lib/leads/channel-links";
import type { ContactLead } from "@/lib/leads/queries";
import { ChannelIcon } from "@/components/leads/ChannelIcon";
import { EditLeadDrawer } from "@/components/leads/EditLeadDrawer";
import { AssigneeLabel } from "@/components/leads/AssigneeLabel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// The click-to-action row: tel:, sms:, mailto:, the channel links and the Maps
// deep link are the Click-to-Action Real-Time Shortcuts. They must stay real
// <a> elements, so each is a Button with `asChild` — the primitive's own
// classes, not a hand-copied string. One link per channel the lead has, from
// the same channelLinks() as the profile header (#37).
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
            <Button key={link.kind} asChild variant="secondary" size="sm">
              <a
                href={link.href}
                {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                <ChannelIcon kind={link.kind} className="size-3.5" />
                {link.label}
              </a>
            </Button>
          ))}
        </div>
      </Card>

      <EditLeadDrawer lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
