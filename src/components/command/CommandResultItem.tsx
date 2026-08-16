"use client";

import type { ContactLead } from "@/lib/leads/queries";
import { OptionRow } from "@/components/ui/OptionRow";

// Was a raw <button> with a hand-written class string — the last one in the
// shell. It is now a thin mapper: OptionRow owns the row's semantics and
// appearance, this owns which fields of a lead appear on it.
//
// Button was the wrong primitive to reach for. This is a full-width row in a
// listbox, not a control the user aims at; see OptionRow for why it must not
// be focusable at all.
export function CommandResultItem({
  id,
  lead,
  active,
  onSelect,
  onHover,
}: {
  id: string;
  lead: ContactLead;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <OptionRow id={id} selected={active} onClick={onSelect} onMouseEnter={onHover}>
      <span className="text-body-md truncate font-medium">{lead.client_name}</span>
      <span className="text-body-sm truncate text-ink-muted">
        {[lead.company, lead.email].filter(Boolean).join(" · ")}
      </span>
    </OptionRow>
  );
}
