"use client";

import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";

import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

// Collapse is MANUAL and desktop-only. It never fires off a viewport query:
// below the md breakpoint the sidebar is not displayed in either state, so an
// automatic collapse would be a third state nobody asked for.
export function SidebarCollapseToggle() {
  const { collapsed, toggleSidebar } = useShell();

  const Icon = collapsed ? IconLayoutSidebarLeftExpand : IconLayoutSidebarLeftCollapse;
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";

  const button = (
    <Button
      type="button"
      variant="ghost"
      onClick={toggleSidebar}
      aria-label={label}
      // aria-expanded, not aria-pressed: this control owns the disclosure of
      // the nav labels, and a screen reader should announce that state rather
      // than "pressed".
      aria-expanded={!collapsed}
      className={cn(collapsed ? "w-full px-0" : "w-8 px-0")}
    >
      <Icon className="size-5" stroke={1.75} />
    </Button>
  );

  return (
    <div
      className={cn(
        "flex shrink-0 border-t border-hairline p-2",
        collapsed ? "justify-center" : "justify-end",
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </div>
  );
}
