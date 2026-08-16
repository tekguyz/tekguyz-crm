"use client";

import { IconSearch } from "@tabler/icons-react";

import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";

// Replaces the header's search FIELD. A field cannot survive a collapsed
// sidebar or a phone viewport — it needs width it will not have — whereas one
// compact control works at every width and opens the palette that was already
// doing the real searching.
//
// The ⌘K shortcut itself lives in ShellContext, so it works from every route
// whether or not this control is on screen. This is the affordance for people
// who will never learn the shortcut, which is why it is a real button and not
// a hint.
export function CommandTrigger() {
  const { openCommand } = useShell();

  return (
    <Button type="button" variant="secondary" onClick={openCommand}>
      <IconSearch className="size-5" stroke={1.75} />
      Search
      {/* The hint is desktop-only: a phone has no ⌘, and printing a shortcut
          nobody can press is noise. */}
      <kbd className="text-label ml-4 hidden rounded-sm border border-hairline px-1.5 py-0.5 text-ink-muted md:inline">
        ⌘K
      </kbd>
    </Button>
  );
}
