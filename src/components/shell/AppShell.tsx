import { Suspense, type ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";
import { ProfileSheetController } from "@/components/leads/profile/ProfileSheetController";
import { ProfileSheetSkeleton } from "@/components/leads/profile/ProfileSheetSkeleton";
import { HelpProvider } from "@/components/help/HelpContext";
import { HelpDrawer } from "@/components/help/HelpDrawer";

export function AppShell({
  children,
  orgName,
  userEmail,
  displayName,
}: {
  children: ReactNode;
  orgName: string;
  userEmail: string;
  displayName: string | null;
}) {
  return (
    // HelpProvider wraps the whole shell so the Header's "?" and every inline
    // HelpTooltip on any authenticated route reach the same drawer — the same
    // "reachable from anywhere" reasoning ProfileSheetController is mounted
    // here for. No Suspense boundary: unlike ProfileSheetController this is
    // plain in-memory state with no useSearchParams() call to suspend on.
    <HelpProvider>
      <div className="flex h-screen bg-canvas-soft text-ink-main">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header orgName={orgName} userEmail={userEmail} displayName={displayName} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
        <Suspense fallback={<ProfileSheetSkeleton />}>
          <ProfileSheetController />
        </Suspense>
        <HelpDrawer />
      </div>
    </HelpProvider>
  );
}
