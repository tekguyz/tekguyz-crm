"use client";

import { IconHelpCircle } from "@tabler/icons-react";

import { useHelp } from "@/components/help/HelpContext";
import { Button } from "@/components/ui/Button";

// Help is a header icon button, not a row in the avatar menu (Shell/IA Variant
// C, picked 2026-09-07). It is the one control a first-week user reaches for,
// and a menu hides it behind a click.
//
// Focus return needs nothing extra here, unlike the old menu row: HelpContext
// captures document.activeElement at open, and a real click leaves focus on
// this button, which is still mounted when the drawer closes.
export function HelpTrigger() {
  const { openHelp } = useHelp();

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => openHelp()}
      aria-label="Help"
      title="Help"
      className="w-8 px-0"
    >
      <IconHelpCircle className="size-5" stroke={1.75} />
    </Button>
  );
}
