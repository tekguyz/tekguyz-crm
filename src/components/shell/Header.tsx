import { CommandTrigger } from "@/components/shell/CommandTrigger";
import { IdentityMenu } from "@/components/shell/IdentityMenu";

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
export function Header({
  userEmail,
  displayName,
}: {
  userEmail: string;
  displayName: string | null;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-canvas-pure px-4">
      <CommandTrigger />
      <IdentityMenu userEmail={userEmail} displayName={displayName} />
    </header>
  );
}
