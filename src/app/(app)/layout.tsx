import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/AppShell";
import { getCurrentOrg } from "@/lib/organizations/current";
import { SIDEBAR_COOKIE_NAME, parseSidebarState } from "@/lib/shell/sidebar-cookie";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Sidebar collapse state is read here, on the server, so the HTML that
  // arrives already carries the correct width — no flash of an expanded
  // sidebar for someone who prefers the rail. This layout was already dynamic
  // (getCurrentOrg reads the Supabase auth cookies), so reading one more
  // cookie costs nothing.
  const [{ orgName, userEmail, displayName }, cookieStore] = await Promise.all([
    getCurrentOrg(),
    cookies(),
  ]);

  return (
    <AppShell
      orgName={orgName}
      userEmail={userEmail}
      displayName={displayName}
      sidebar={parseSidebarState(cookieStore.get(SIDEBAR_COOKIE_NAME)?.value)}
    >
      {children}
    </AppShell>
  );
}
