"use client";

import { createContext, useContext, type ReactNode } from "react";

// The signed-in user's role in the current org, resolved once per request by
// getCurrentOrg() in the (app) server layout and handed down here.
//
// A context rather than a prop chain because the only consumer that needs it —
// EditLeadModal — is mounted from four unrelated card components (agenda,
// contacts, pipeline focus list, pipeline kanban), each rendered by its own
// page. Threading one static server value through eight files to reach one
// modal is the kind of restructuring that makes the field set of a form harder
// to see, not easier. It is deliberately a separate provider from
// ShellContext: that one owns mutable shell STATE (sidebar, command palette),
// this is an immutable per-request fact.
const RoleContext = createContext<string | null>(null);

export function RoleProvider({ role, children }: { role: string; children: ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useOrgRole() {
  const role = useContext(RoleContext);
  if (role === null) throw new Error("useOrgRole must be used within a RoleProvider");
  return role;
}
