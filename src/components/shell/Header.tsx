import { CommandTrigger } from "@/components/shell/CommandTrigger";
import { IdentityMenu } from "@/components/shell/IdentityMenu";
import { DemoModeBadge } from "@/components/shell/DemoModeBadge";

// The header holds exactly two things, at every width: command entry on the
// left, the identity menu on the right.
//
// It used to hold six — a search field plus name, avatar, theme toggle, help
// and sign out, five controls doing one job. Search became a ⌘K affordance
// (CommandTrigger) and the other five collapsed into one avatar menu
// (IdentityMenu).
//
// Workspace identity deliberately does NOT appear here. On desktop it is the
// sidebar's WorkspaceBlock; on mobile, where the sidebar is not displayed, it
// is the "More" sheet's title. Putting it in the header as well would make the
// header a third concern at exactly the width that has least room for one.
//
// The demo badge is the one exception, and it does not reopen that rule. It is
// a session-mode indicator rather than workspace identity, it renders for the
// public read-only demo identity ONLY — so for every real tenant this header
// still holds exactly two things — and it has to survive a collapsed sidebar
// and a phone, which is exactly what WorkspaceBlock cannot do. Full reasoning
// lives in DemoModeBadge.tsx.
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
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-canvas-pure px-4">
      {/* min-w-0 so the badge never squeezes the command trigger off a narrow
          header — the trigger truncates instead. */}
      <div className="flex min-w-0 items-center gap-2">
        <CommandTrigger />
        {isDemo ? <DemoModeBadge /> : null}
      </div>
      <IdentityMenu userEmail={userEmail} displayName={displayName} />
    </header>
  );
}
