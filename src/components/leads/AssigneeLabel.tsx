"use client";

import { IconUser } from "@tabler/icons-react";
import { memberLabel, useOrgMembers } from "@/components/shell/MembersContext";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

// Who owns a lead, shown on the cards. Renders nothing at all when a lead is
// unassigned — an "Unassigned" chip on most cards in a young workspace would
// be noise, and the absence of the row already says it.
//
// Neutral by design: ink-muted and an outline icon, no pill colour. The
// decorative pill palette is for category dots and status badges only, and
// ownership is neither. The one signal a card carries is Going Cold, which
// must not have to compete with this.
//
// `avatar` swaps the outline icon for the person's initials avatar, for a
// column that names the owner on every row (Contacts). There, an unowned row
// says "Unassigned" rather than leaving a hole in the column.
export function AssigneeLabel({
  assignedTo,
  avatar = false,
}: {
  assignedTo: string | null;
  avatar?: boolean;
}) {
  const members = useOrgMembers();

  if (!assignedTo) {
    return avatar ? <span className="text-body-sm text-ink-muted">Unassigned</span> : null;
  }

  const member = members.find((m) => m.user_id === assignedTo);
  const label = member ? memberLabel(member) : "Former member";

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center text-ink-muted",
        avatar ? "text-body-sm gap-1.5" : "text-caption gap-1",
      )}
      title={member ? member.email : "This person is no longer in this organization"}
    >
      {avatar ? (
        <Avatar name={label} size="sm" />
      ) : (
        <IconUser aria-hidden="true" stroke={1.75} className="size-3.5 shrink-0" />
      )}
      {/* An assignee who has left the org still shows, rather than vanishing:
          the lead really is still pointed at somebody, and hiding that would
          hide the thing that needs fixing. */}
      <span className="truncate">{label}</span>
    </span>
  );
}
