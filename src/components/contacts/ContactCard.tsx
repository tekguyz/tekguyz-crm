"use client";

import { useState } from "react";
import { Phone, MessageSquare, Mail, MapPin } from "lucide-react";
import type { ContactLead } from "@/lib/leads/queries";
import { EditLeadModal } from "@/components/leads/EditLeadModal";

const actionLinkClass =
  "flex items-center gap-1.5 rounded-md border border-hairline px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink-main";

export function ContactCard({ lead }: { lead: ContactLead }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
        className="flex cursor-pointer flex-col gap-3 rounded-lg border border-hairline bg-canvas-pure p-6 shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{lead.client_name}</p>
          {lead.company && (
            <p className="truncate text-xs text-ink-muted">{lead.company}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          {lead.phone && (
            <>
              <a href={`tel:${lead.phone}`} className={actionLinkClass}>
                <Phone className="size-3.5" />
                Call
              </a>
              <a href={`sms:${lead.phone}`} className={actionLinkClass}>
                <MessageSquare className="size-3.5" />
                Text
              </a>
            </>
          )}
          <a href={`mailto:${lead.email}`} className={actionLinkClass}>
            <Mail className="size-3.5" />
            Email
          </a>
          {lead.physical_address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.physical_address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={actionLinkClass}
            >
              <MapPin className="size-3.5" />
              Map
            </a>
          )}
        </div>
      </div>

      <EditLeadModal lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
