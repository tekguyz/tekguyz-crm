"use client";

import { useShell } from "@/components/shell/ShellContext";
import { CreateLeadModal } from "@/components/leads/CreateLeadModal";

// The one primary CTA in the shell. Collapsed, CreateLeadModal's trigger keeps
// its icon and drops its label to an sr-only span — see the `compact` prop
// there — so the rail stays a single column of glyphs without losing the
// action or its accessible name.
export function SidebarQuickAction() {
  const { collapsed } = useShell();

  return (
    <div className="shrink-0 border-t border-hairline p-2">
      <CreateLeadModal compact={collapsed} />
    </div>
  );
}
