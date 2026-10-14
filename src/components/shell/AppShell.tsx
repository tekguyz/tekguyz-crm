import { Suspense, type ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/shell/Header";
import { MobileTabBar } from "@/components/shell/MobileTabBar";
import { ShellProvider } from "@/components/shell/ShellContext";
import { RoleProvider } from "@/components/shell/RoleContext";
import { MembersProvider } from "@/components/shell/MembersContext";
import { ShellCommandBar } from "@/components/shell/ShellCommandBar";
import { ProfileSheetController } from "@/components/leads/profile/ProfileSheetController";
import { ProfileSheetSkeleton } from "@/components/leads/profile/ProfileSheetSkeleton";
import { HelpProvider } from "@/components/help/HelpContext";
import { HelpDrawer } from "@/components/help/HelpDrawer";
import { IdleTimeoutController } from "@/components/shell/IdleTimeoutController";
import { DemoBanner } from "@/components/shell/DemoBanner";
import type { SidebarState } from "@/lib/shell/sidebar-cookie";
import type { TeamMember } from "@/lib/invites/queries";

export function AppShell({
  children,
  header,
  orgName,
  userEmail,
  displayName,
  role,
  members,
  sidebar,
  isDemo,
  shortcut,
}: {
  children: ReactNode;
  // The route's @header slot (src/app/(app)/@header/): its PageHeader, which
  // the Header renders on its left. See Header.tsx.
  header: ReactNode;
  orgName: string;
  userEmail: string;
  displayName: string | null;
  // The signed-in user's org role, resolved by getCurrentOrg() in the server
  // layout. Published through RoleProvider so lead controls the database
  // reserves for OWNER/ADMIN are not offered to a MEMBER at all.
  role: string;
  // Everyone in the org, for the lead assignment picker and the assignee label
  // on the cards. Published through MembersProvider for the same reason `role`
  // goes through RoleProvider — see MembersContext.tsx.
  members: TeamMember[];
  // Read from a cookie in the server layout, so the first paint already has
  // the right sidebar width. See src/lib/shell/sidebar-cookie.ts.
  sidebar: SidebarState;
  // organizations.is_demo for the current tenant. Drives the demo banner and
  // the idle-timeout exemption, and nothing else — it is presentation only.
  // The Demo Block's real boundary is on the server (src/lib/demo/demo-block.ts),
  // whether or not this prop is ever passed correctly.
  isDemo: boolean;
  // The search keycap's label, read from the request in the (app) layout.
  shortcut: "⌘K" | "Ctrl K";
}) {
  return (
    // HelpProvider wraps the whole shell so the identity menu's Help item, the
    // mobile More sheet's Help button and every inline HelpTooltip on any
    // authenticated route reach the same drawer — the same "reachable from
    // anywhere" reasoning ProfileSheetController is mounted here for. No
    // Suspense boundary: unlike ProfileSheetController this is plain in-memory
    // state with no useSearchParams() call to suspend on.
    //
    // RoleProvider publishes the request's org role, MembersProvider the org's
    // member list, and ShellProvider owns the other two shell-wide concerns:
    // sidebar collapse state and the command palette.
    <HelpProvider>
      <RoleProvider role={role}>
        <MembersProvider members={members}>
          <ShellProvider initialSidebar={sidebar}>
            {/* `relative` is the positioning context for the sidebar. The rail is
                overlaid (position:absolute) rather than an in-flow flex sibling, so
                its collapse animation is a compositor-only `translate` that never
                relays out the content area; Sidebar renders its own non-animated
                in-flow spacer here to keep the content column clear of it. See
                Sidebar.tsx for the two-layer mechanism. */}
            <div className="relative flex h-dvh bg-canvas-soft text-ink-main">
              {/* First in the tab order, parked above the viewport until
                  focused: without it a keyboard user crosses the whole rail
                  and the header (14 stops on desktop) before reaching any
                  content. A translate, not sr-only: not-sr-only zeroes the
                  padding and height Button gives it. */}
              <Button
                asChild
                variant="secondary"
                className="absolute top-2 left-2 z-50 -translate-y-20 focus:translate-y-0"
              >
                <a href="#main">Skip to content</a>
              </Button>
              <Sidebar orgName={orgName} />
              {/* Before <main> in the DOM even though it is painted at the bottom
                  of the screen: navigation should come before content in the tab
                  order and in the reading order, exactly as the sidebar does on
                  desktop. It is position:fixed, so its source order costs nothing
                  visually. */}
              <MobileTabBar orgName={orgName} userEmail={userEmail} />
              <div className="flex min-w-0 flex-1 flex-col">
                {isDemo ? <DemoBanner /> : null}
                <Header userEmail={userEmail} displayName={displayName} shortcut={shortcut}>
                  {header}
                </Header>
                {/* pb-24 below md clears the fixed bottom tab bar; above md the
                    bar is not displayed and the padding returns to the shell's
                    normal 6.

                    `relative` is load-bearing, not decoration: it makes <main>
                    the containing block for its own absolutely-positioned
                    descendants. Without it they resolve to the shell's
                    `relative` div instead, which is OUTSIDE this scroll
                    container — so they are not clipped by overflow-y-auto and
                    they inflate the DOCUMENT's scroll height to the full
                    content height. That produced a second, page-length
                    scrollbar underneath the real one on every long view: every
                    `.sr-only` span (Tailwind's uses position:absolute) and
                    Radix Checkbox's hidden bubble <input> escaped this way.
                    Measured on /prospects and /settings before the fix. */}
                <main
                  id="main"
                  tabIndex={-1}
                  className="relative flex-1 overflow-y-auto p-4 pb-24 focus:outline-none md:p-6"
                >
                  {children}
                </main>
              </div>
              <Suspense fallback={<ProfileSheetSkeleton />}>
                <ProfileSheetController />
              </Suspense>
              <HelpDrawer />
              <ShellCommandBar />
              {/* The idle-timeout clock. Mounted here, at the one place every
                  authenticated route passes through, so it survives navigation
                  instead of restarting on each page. It renders nothing until
                  the warning fires. */}
              <IdleTimeoutController isDemo={isDemo} />
            </div>
          </ShellProvider>
        </MembersProvider>
      </RoleProvider>
    </HelpProvider>
  );
}
