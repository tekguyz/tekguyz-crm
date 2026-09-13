"use client";

import { useShell } from "@/components/shell/ShellContext";
import { CreateLeadDrawer } from "@/components/leads/CreateLeadDrawer";

// The one primary CTA in the shell. It LEADS the rail, above the destinations,
// rather than sitting in its own footer band: it is the most-used control in
// the sidebar, and the Quiet variant exists to take bands out of the bottom of
// the rail, not add them. Collapsed, CreateLeadDrawer's trigger keeps its icon
// and drops its label to an sr-only span — see the `compact` prop there — so
// the rail stays a single column of glyphs without losing the action or its
// accessible name.
export function SidebarQuickAction() {
  const { collapsed } = useShell();

  return <CreateLeadDrawer compact={collapsed} />;
}
