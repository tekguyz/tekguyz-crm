"use client";

import { IconUser } from "@tabler/icons-react";
import { memberLabel, useOrgMembers } from "@/components/shell/MembersContext";

// Who owns a lead, shown on the cards. Renders nothing at all when a lead is
// unassigned — an "Unassigned" chip on most cards in a young workspace would
// be noise, and the absence of the row already says it.
//
// Neutral by design: ink-muted and an outline icon, no pill colour. The
// decorative pill palette is for category dots and status badges only, and
// ownership is neither. The one signal a card carries is Going Cold, which
// must not have to compete with this.
export function AssigneeLabel({ assignedTo }: { assignedTo: string | null }) {
  const members = useOrgMembers();

  if (!assignedTo) return null;

  const member = members.find((m) => m.user_id === assignedTo);

  return (
    <span
      className="text-caption inline-flex min-w-0 items-center gap-1 text-ink-muted"
      title={member ? member.email : "This person is no longer in this organization"}
    >
      <IconUser aria-hidden="true" stroke={1.75} className="size-3.5 shrink-0" />
      {/* An assignee who has left the org still shows, rather than vanishing:
          the lead really is still pointed at somebody, and hiding that would
          hide the thing that needs fixing. */}
      <span className="truncate">{member ? memberLabel(member) : "Former member"}</span>
    </span>
  );
}
