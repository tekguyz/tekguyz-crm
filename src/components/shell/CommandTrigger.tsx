"use client";

import { IconSearch } from "@tabler/icons-react";

import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";

// Replaces the header's search FIELD. A field cannot survive a collapsed
// sidebar or a phone viewport — it needs width it will not have — whereas one
// compact control works at every width and opens the palette that was already
// doing the real searching.
//
// Compact since Shell/IA Variant C: a glyph plus its shortcut, no visible word.
// The header now also carries the page title and Help, and "Search" would be
// the first thing to overflow on a narrow bar. The accessible name carries the
// word instead.
//
// The ⌘K / Ctrl-K shortcut itself lives in ShellContext, so it works from every
// route whether or not this control is on screen. This is the affordance for
// people who will never learn the shortcut, which is why it is a real button
// and not a hint. The keycap's label comes from the server (see
// src/lib/shell/platform.ts), so it is right in the first paint.
export function CommandTrigger({ shortcut }: { shortcut: "⌘K" | "Ctrl K" }) {
  const { openCommand } = useShell();

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={openCommand}
      aria-label="Search"
      title="Search"
      className="gap-2 max-sm:min-w-11"
    >
      <IconSearch className="size-5 text-ink-muted" stroke={1.75} />
      {/* The hint is desktop-only: a phone has no modifier key, and printing a shortcut
          nobody can press is noise. */}
      <kbd className="text-label hidden rounded-sm border border-hairline px-1.5 py-0.5 text-ink-muted md:inline">
        {shortcut}
      </kbd>
    </Button>
  );
}
