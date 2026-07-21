"use client";

import { useEffect, useState } from "react";
import { Search, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { CommandBar } from "@/components/command/CommandBar";

export function Header({
  orgName,
  userEmail,
}: {
  orgName: string;
  userEmail: string;
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
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="flex items-center gap-2 rounded-md border border-hairline px-3.5 py-1 text-sm text-ink-muted shadow-elevation-1 transition-colors hover:bg-canvas-soft hover:text-ink-main"
      >
        <Search className="size-4" />
        Search
        <kbd className="ml-4 rounded border border-hairline px-1.5 py-0.5 text-xs text-ink-muted">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-3">
        <span className="text-sm text-ink-muted" title={userEmail}>
          {orgName}
        </span>
        <div
          className="flex size-8 items-center justify-center rounded-full border border-hairline bg-canvas-soft text-xs font-medium uppercase"
          title={userEmail}
        >
          {userEmail.slice(0, 1) || "?"}
        </div>
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            className="flex size-8 items-center justify-center rounded-md border border-hairline text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink-main"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>

      <CommandBar open={commandOpen} onClose={() => setCommandOpen(false)} />
    </header>
  );
}
