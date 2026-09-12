"use client";

import { useShell } from "@/components/shell/ShellContext";
import { CreateLeadDrawer } from "@/components/leads/CreateLeadDrawer";

// The one primary CTA in the shell. Collapsed, CreateLeadDrawer's trigger keeps
// its icon and drops its label to an sr-only span — see the `compact` prop
// there — so the rail stays a single column of glyphs without losing the
// action or its accessible name.
export function SidebarQuickAction() {
  const { collapsed } = useShell();

  return (
    <div className="shrink-0 border-t border-hairline p-2">
      <CreateLeadDrawer compact={collapsed} />
    </div>
  );
}
