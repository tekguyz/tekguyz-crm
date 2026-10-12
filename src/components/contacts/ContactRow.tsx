"use client";

import { useState } from "react";
import { channelLinks, type ChannelLinkKind } from "@/lib/leads/channel-links";
import type { ContactLead } from "@/lib/leads/queries";
import { AssigneeLabel } from "@/components/leads/AssigneeLabel";
import { ChannelIcon } from "@/components/leads/ChannelIcon";
import { EditLeadDrawer } from "@/components/leads/EditLeadDrawer";
import { StageBadge } from "@/components/leads/StageBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

// The channels a phone row keeps. The rest (website, socials, map) are one
// tap away in the lead's panel header; on a 375px row they would push the
// call/text/email targets below 44px or onto a third line.
const PHONE_CHANNELS = new Set<ChannelLinkKind>(["call", "text", "email", "whatsapp"]);

// One Contacts row. The name is the row's one <button>: its ::after stretches
// over the whole row, so a click anywhere opens the lead, while the channel
// links sit above it (`relative z-10`) as real <a> elements beside the button,
// never inside it. The old card nested the links in a role=button div, so
// Enter on "Call" also opened the drawer.
//
// The four cells are a subgrid of ContactsList's columns at lg and up, so the
// stage, channel and owner columns line up down the list. Below lg the row is
// two lines: identity and stage, then the channels and owner under the name.
export function ContactRow({ lead }: { lead: ContactLead }) {
  const [open, setOpen] = useState(false);
  const links = channelLinks(lead);

  return (
    <li className="relative flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 transition-colors hover:bg-canvas-soft lg:col-span-4 lg:grid lg:grid-cols-subgrid lg:gap-x-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-sm text-left after:absolute after:inset-0 after:content-['']"
      >
        <Avatar name={lead.client_name} size="sm" />
        <span className="min-w-0">
          <span className="text-body-md block truncate font-medium">{lead.client_name}</span>
          {lead.company ? (
            <span className="text-body-sm block truncate text-ink-muted">{lead.company}</span>
          ) : null}
        </span>
      </button>

      <StageBadge status={lead.status} className="shrink-0 justify-self-start" />

      {/* Forces the second line below lg; display:none takes it out of the grid. */}
      <span aria-hidden="true" className="basis-full lg:hidden" />

      <div className="flex min-h-11 min-w-0 flex-1 items-center gap-1 pl-9 lg:min-h-0 lg:pl-0">
        {links.map((link) => (
          <Button
            key={link.kind}
            asChild
            variant="ghost"
            size="sm"
            className={cn(
              "relative z-10 size-11 justify-center px-0 lg:size-8",
              !PHONE_CHANNELS.has(link.kind) && "hidden lg:inline-flex",
            )}
          >
            <a
              href={link.href}
              aria-label={`${link.label} ${lead.client_name}`}
              title={link.label}
              {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <ChannelIcon kind={link.kind} className="size-[1.125rem] lg:size-4" />
            </a>
          </Button>
        ))}
      </div>

      {/* "Unassigned" holds the desktop column's place; on a phone row it is
          noise repeated down the whole list, so only an owner shows there. */}
      <div
        className={cn(
          "flex min-w-0 shrink-0 justify-end lg:justify-start",
          !lead.assigned_to && "hidden lg:flex",
        )}
      >
        <AssigneeLabel assignedTo={lead.assigned_to} avatar />
      </div>

      <EditLeadDrawer lead={lead} open={open} onClose={() => setOpen(false)} />
    </li>
  );
}
