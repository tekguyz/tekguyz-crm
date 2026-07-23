import { Suspense, type ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";
import { ProfileSheetController } from "@/components/leads/profile/ProfileSheetController";
import { ProfileSheetSkeleton } from "@/components/leads/profile/ProfileSheetSkeleton";

export function AppShell({
  children,
  orgName,
  userEmail,
}: {
  children: ReactNode;
  orgName: string;
  userEmail: string;
}) {
  return (
    <div className="flex h-screen bg-canvas-soft text-ink-main">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header orgName={orgName} userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <Suspense fallback={<ProfileSheetSkeleton />}>
        <ProfileSheetController />
      </Suspense>
    </div>
  );
}
