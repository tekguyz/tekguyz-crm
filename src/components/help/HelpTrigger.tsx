"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { HelpDrawer } from "@/components/help/HelpDrawer";

// Owns open/closed state locally for now. If a second entry point ever needs
// to open the drawer (a keyboard shortcut, a deep link), lift this state to a
// shared provider rather than duplicating it here.
export function HelpTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <HelpDrawer
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <button
          type="button"
          title="Help"
          className="flex size-8 items-center justify-center rounded-md border border-hairline text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink-main"
        >
          <HelpCircle className="size-4" />
          <span className="sr-only">Help</span>
        </button>
      }
    />
  );
}
