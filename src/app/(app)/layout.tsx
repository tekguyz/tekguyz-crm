import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { AppShell } from "@/components/shell/AppShell";
import { getCurrentOrg } from "@/lib/organizations/current";
import { getTeamMembers } from "@/lib/invites/queries";
import { isApplePlatform, shortcutLabel } from "@/lib/shell/platform";
import { SIDEBAR_COOKIE_NAME, parseSidebarState } from "@/lib/shell/sidebar-cookie";

// `header` is the @header parallel-route slot (./@header/): each route's
// PageHeader, rendered on the left of the shell header. A slot rather than a
// prop the page passes up, because a page cannot reach its layout — and a
// slot is still server-rendered with the page, so the count and the action
// arrive in the first paint.
export default async function AppLayout({
  children,
  header,
}: {
  children: ReactNode;
  header: ReactNode;
}) {
  // Sidebar collapse state is read here, on the server, so the HTML that
  // arrives already carries the correct width — no flash of an expanded
  // sidebar for someone who prefers the rail. This layout was already dynamic
  // (getCurrentOrg reads the Supabase auth cookies), so reading one more
  // cookie costs nothing. The request headers are read for the same reason:
  // the search keycap prints Ctrl K or ⌘K, and deciding that here means it is
  // right in the first paint.
  const [{ orgId, orgName, userEmail, displayName, role, isDemo }, cookieStore, headerStore] =
    await Promise.all([getCurrentOrg(), cookies(), headers()]);

  const shortcut = shortcutLabel(
    isApplePlatform(headerStore.get("sec-ch-ua-platform"), headerStore.get("user-agent")),
  );

  // Sequential rather than inside the Promise.all above: it needs orgId, which
  // only exists once getCurrentOrg has resolved. One indexed RPC
  // (get_organization_members, served by unique_org_member), fetched here so
  // the assignment picker inside EditLeadDrawer — mounted per card on four
  // different pages — never has to fetch on open and never shows a loading
  // state inside a form.
  const members = await getTeamMembers(orgId);

  return (
    <AppShell
      header={header}
      orgName={orgName}
      userEmail={userEmail}
      displayName={displayName}
      role={role}
      members={members}
      isDemo={isDemo}
      shortcut={shortcut}
      sidebar={parseSidebarState(cookieStore.get(SIDEBAR_COOKIE_NAME)?.value)}
    >
      {children}
    </AppShell>
  );
}
