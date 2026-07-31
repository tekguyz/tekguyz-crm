"use client";

import { HelpCircle } from "lucide-react";
import { useHelp } from "@/components/help/HelpContext";

// Just an opener now — the drawer itself is mounted once in AppShell and
// driven by HelpContext, so this no longer owns any open/closed state and
// deliberately renders no <HelpDrawer> of its own.
export function HelpTrigger() {
  const { openHelp } = useHelp();

  return (
    <button
      type="button"
      title="Help"
      onClick={() => openHelp()}
      className="flex size-8 items-center justify-center rounded-md border border-hairline text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink-main"
    >
      <HelpCircle className="size-4" />
      <span className="sr-only">Help</span>
    </button>
  );
}
