"use client";

import { useShell } from "@/components/shell/ShellContext";
import { SidebarCollapseToggle } from "@/components/shell/SidebarCollapseToggle";
import { SidebarNav } from "@/components/shell/SidebarNav";
import { SidebarQuickAction } from "@/components/shell/SidebarQuickAction";
import { WorkspaceBlock } from "@/components/shell/WorkspaceBlock";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

// Desktop only. `hidden md:flex` is what makes the sidebar and the mobile
// bottom tab bar mutually exclusive: display:none takes the whole subtree out
// of the accessibility tree and out of the tab order, so a phone has exactly
// one navigation landmark and one set of focusable nav links, never two.
//
// It is a CSS rule rather than a JS media query on purpose. A viewport check
// cannot run on the server, so a JS-gated sidebar would render on a phone's
// first paint and unmount a frame later — the exact flash the collapse cookie
// exists to avoid, reintroduced on the axis it cannot help with.
//
// The width transition is a plain CSS transition, so the global
// prefers-reduced-motion block in globals.css clamps it to 0.01ms for anyone
// who has asked for that. There is no JS animation here to slip past it.
export function Sidebar({ orgName }: { orgName: string }) {
  const { collapsed } = useShell();

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-hairline bg-canvas-pure transition-[width] duration-200 md:flex",
          collapsed ? "w-14" : "w-60",
        )}
      >
        <WorkspaceBlock orgName={orgName} collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} />
        <SidebarQuickAction />
        <SidebarCollapseToggle />
      </aside>
    </TooltipProvider>
  );
}
