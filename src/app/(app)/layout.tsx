import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { getCurrentOrg } from "@/lib/organizations/current";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { orgName, userEmail } = await getCurrentOrg();

  return (
    <AppShell orgName={orgName} userEmail={userEmail}>
      {children}
    </AppShell>
  );
}
