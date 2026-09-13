import { CommandTrigger } from "@/components/shell/CommandTrigger";
import { DemoModeBadge } from "@/components/shell/DemoModeBadge";
import { HelpTrigger } from "@/components/shell/HelpTrigger";
import { IdentityMenu } from "@/components/shell/IdentityMenu";
import { PageTitle } from "@/components/shell/PageTitle";

// Shell/IA Variant C, "Quiet" (picked 2026-09-07, wired 2026-09-13). The
// header is the PAGE'S strip, not the app's: the current destination's name on
// the left, the global controls on the right in a fixed order — Help, search,
// a seam, identity hard right.
//
// This replaced "the header holds exactly two things". It holds four and is
// still 8px shorter than the bar that held two (48px, not 56px), because one
// of the four is text and two are 32px glyphs.
//
// Workspace identity still does NOT appear here. On desktop it is the
// sidebar's WorkspaceBlock; on mobile it is the "More" sheet's title.
//
// The demo badge sits beside the title, for the public read-only demo identity
// ONLY. It is a session-mode indicator rather than workspace identity, and it
// has to survive a collapsed sidebar and a phone, which WorkspaceBlock cannot
// do. Full reasoning lives in DemoModeBadge.tsx.
export function Header({
  userEmail,
  displayName,
  isDemo,
}: {
  userEmail: string;
  displayName: string | null;
  isDemo: boolean;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-canvas-pure px-4">
      {/* min-w-0 so a long title truncates instead of pushing the controls
          off a narrow header. */}
      <div className="flex min-w-0 items-center gap-2">
        <PageTitle />
        {isDemo ? (
          <span className="shrink-0 whitespace-nowrap">
            <DemoModeBadge />
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <HelpTrigger />
        <CommandTrigger />
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-hairline" />
        <IdentityMenu userEmail={userEmail} displayName={displayName} />
      </div>
    </header>
  );
}
