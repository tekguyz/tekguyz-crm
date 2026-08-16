"use client";

import { IconHelpCircle } from "@tabler/icons-react";
import { useHelp } from "@/components/help/HelpContext";
import { Button } from "@/components/ui/Button";

// Just an opener now — the drawer itself is mounted once in AppShell and
// driven by HelpContext, so this no longer owns any open/closed state and
// deliberately renders no <HelpDrawer> of its own.
//
// `w-8 px-0` squares off Button's md size for an icon-only control. It is the
// exact same treatment ThemeToggle and the Header's sign-out button use, on
// purpose: these three sit side by side in the Header and any hand-tuned
// variation between them is visible.
export function HelpTrigger() {
  const { openHelp } = useHelp();

  return (
    <Button
      type="button"
      variant="secondary"
      title="Help"
      onClick={() => openHelp()}
      className="w-8 px-0"
    >
      <IconHelpCircle className="size-5" stroke={1.75} />
      <span className="sr-only">Help</span>
    </Button>
  );
}
