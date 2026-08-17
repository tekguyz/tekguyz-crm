import { Suspense, type ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";
import { MobileTabBar } from "@/components/shell/MobileTabBar";
import { ShellProvider } from "@/components/shell/ShellContext";
import { ShellCommandBar } from "@/components/shell/ShellCommandBar";
import { ProfileSheetController } from "@/components/leads/profile/ProfileSheetController";
import { ProfileSheetSkeleton } from "@/components/leads/profile/ProfileSheetSkeleton";
import { HelpProvider } from "@/components/help/HelpContext";
import { HelpDrawer } from "@/components/help/HelpDrawer";
import type { SidebarState } from "@/lib/shell/sidebar-cookie";

export function AppShell({
  children,
  orgName,
  userEmail,
  displayName,
  sidebar,
}: {
  children: ReactNode;
  orgName: string;
  userEmail: string;
  displayName: string | null;
  // Read from a cookie in the server layout, so the first paint already has
  // the right sidebar width. See src/lib/shell/sidebar-cookie.ts.
  sidebar: SidebarState;
}) {
  return (
    // HelpProvider wraps the whole shell so the identity menu's Help item, the
    // mobile More sheet's Help button and every inline HelpTooltip on any
    // authenticated route reach the same drawer — the same "reachable from
    // anywhere" reasoning ProfileSheetController is mounted here for. No
    // Suspense boundary: unlike ProfileSheetController this is plain in-memory
    // state with no useSearchParams() call to suspend on.
    //
    // ShellProvider sits inside it and owns the other two shell-wide concerns:
    // sidebar collapse state and the command palette.
    <HelpProvider>
      <ShellProvider initialSidebar={sidebar}>
        {/* `relative` is the positioning context for the sidebar. The rail is
            overlaid (position:absolute) rather than an in-flow flex sibling, so
            its collapse animation is a compositor-only `translate` that never
            relays out the content area; Sidebar renders its own non-animated
            in-flow spacer here to keep the content column clear of it. See
            Sidebar.tsx for the two-layer mechanism. */}
        <div className="relative flex h-dvh bg-canvas-soft text-ink-main">
          <Sidebar orgName={orgName} />
          {/* Before <main> in the DOM even though it is painted at the bottom
              of the screen: navigation should come before content in the tab
              order and in the reading order, exactly as the sidebar does on
              desktop. It is position:fixed, so its source order costs nothing
              visually. */}
          <MobileTabBar orgName={orgName} userEmail={userEmail} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header userEmail={userEmail} displayName={displayName} />
            {/* pb-24 below md clears the fixed bottom tab bar; above md the
                bar is not displayed and the padding returns to the shell's
                normal 6. */}
            <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6">{children}</main>
          </div>
          <Suspense fallback={<ProfileSheetSkeleton />}>
            <ProfileSheetController />
          </Suspense>
          <HelpDrawer />
          <ShellCommandBar />
        </div>
      </ShellProvider>
    </HelpProvider>
  );
}
