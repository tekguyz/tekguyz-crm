import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/AppShell";
import { getCurrentOrg } from "@/lib/organizations/current";
import { getTeamMembers } from "@/lib/invites/queries";
import { SIDEBAR_COOKIE_NAME, parseSidebarState } from "@/lib/shell/sidebar-cookie";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Sidebar collapse state is read here, on the server, so the HTML that
  // arrives already carries the correct width — no flash of an expanded
  // sidebar for someone who prefers the rail. This layout was already dynamic
  // (getCurrentOrg reads the Supabase auth cookies), so reading one more
  // cookie costs nothing.
  const [{ orgId, orgName, userEmail, displayName, role }, cookieStore] = await Promise.all([
    getCurrentOrg(),
    cookies(),
  ]);

  // Sequential rather than inside the Promise.all above: it needs orgId, which
  // only exists once getCurrentOrg has resolved. One indexed RPC
  // (get_organization_members, served by unique_org_member), fetched here so
  // the assignment picker inside EditLeadModal — mounted per card on four
  // different pages — never has to fetch on open and never shows a loading
  // state inside a form.
  const members = await getTeamMembers(orgId);

  return (
    <AppShell
      orgName={orgName}
      userEmail={userEmail}
      displayName={displayName}
      role={role}
      members={members}
      sidebar={parseSidebarState(cookieStore.get(SIDEBAR_COOKIE_NAME)?.value)}
    >
      {children}
    </AppShell>
  );
}
