"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { TeamMember } from "@/lib/invites/queries";

// Everyone in the current org, resolved once per request by getTeamMembers()
// in the (app) server layout and handed down here.
//
// A context for exactly the reason RoleContext is one, and it is worth
// restating rather than cross-referencing: the two consumers that need this —
// the assignment picker inside EditLeadModal, and the assignee label on the
// cards — are reached from four unrelated card components (agenda, contacts,
// pipeline focus list, pipeline kanban), each rendered by its own page. Every
// one of those pages renders MANY cards, so a prop would also mean the same
// array threaded through and duplicated per card rather than read once.
//
// Deliberately a separate provider from RoleContext rather than folded into
// it. RoleContext answers "who is the signed-in user"; this answers "who else
// is in the org". They have different shapes, different consumers and only
// happen to be fetched in the same place.
//
// Immutable per request, like RoleContext and unlike ShellContext: adding or
// removing a member goes through Settings, which revalidates.
const MembersContext = createContext<TeamMember[] | null>(null);

export function MembersProvider({
  members,
  children,
}: {
  members: TeamMember[];
  children: ReactNode;
}) {
  return <MembersContext.Provider value={members}>{children}</MembersContext.Provider>;
}

export function useOrgMembers() {
  const members = useContext(MembersContext);
  if (members === null) throw new Error("useOrgMembers must be used within a MembersProvider");
  return members;
}

// What a member is called in the UI. There is no per-member display name on
// organization_members — get_organization_members returns the auth.users email
// — so the email's local part is the best short label available, and the full
// email stays available for a title attribute where one fits.
export function memberLabel(member: TeamMember): string {
  return member.email.split("@")[0] || member.email;
}
