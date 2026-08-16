"use client";

import { useShell } from "@/components/shell/ShellContext";
import { CommandBar } from "@/components/command/CommandBar";

// The palette is mounted once for the whole shell, the same "reachable from
// anywhere" reasoning HelpDrawer and ProfileSheetController are mounted here
// for. It used to live inside Header, which tied the ⌘K listener to the
// header's own lifetime; the listener now lives in ShellContext and this is
// just the surface it opens.
export function ShellCommandBar() {
  const { commandOpen, closeCommand } = useShell();

  return <CommandBar open={commandOpen} onClose={closeCommand} />;
}
