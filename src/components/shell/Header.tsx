"use client";

import { useEffect, useState } from "react";
import { IconSearch, IconLogout } from "@tabler/icons-react";
import { signOut } from "@/lib/auth/actions";
import { CommandBar } from "@/components/command/CommandBar";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { HelpTrigger } from "@/components/help/HelpTrigger";
import { Button } from "@/components/ui/Button";

export function Header({
  orgName,
  userEmail,
  displayName,
}: {
  orgName: string;
  userEmail: string;
  displayName: string | null;
}) {
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-canvas-pure px-4">
      {/* Level 0: the v1 search affordance carried a shadow-elevation-1, which
          v2 reserves for popovers. Button's secondary variant is the same
          hairline surface without it. */}
      <Button type="button" variant="secondary" onClick={() => setCommandOpen(true)}>
        <IconSearch className="size-5" stroke={1.75} />
        Search
        <kbd className="text-label ml-4 rounded-sm border border-hairline px-1.5 py-0.5 text-ink-muted">
          ⌘K
        </kbd>
      </Button>

      <div className="flex items-center gap-3">
        <span className="text-body-md text-ink-muted" title={userEmail}>
          {orgName}
        </span>
        <div
          className="text-label flex size-8 items-center justify-center rounded-full border border-hairline bg-canvas-soft uppercase"
          title={displayName || userEmail}
        >
          {(displayName || userEmail).slice(0, 1) || "?"}
        </div>
        <HelpTrigger />
        <ThemeToggle />
        <form action={signOut}>
          {/* w-8 px-0 squares off Button's md size for an icon-only control;
              the size tokens themselves are untouched. */}
          <Button type="submit" variant="secondary" title="Sign out" className="w-8 px-0">
            <IconLogout className="size-5" stroke={1.75} />
            <span className="sr-only">Sign out</span>
          </Button>
        </form>
      </div>

      <CommandBar open={commandOpen} onClose={() => setCommandOpen(false)} />
    </header>
  );
}
