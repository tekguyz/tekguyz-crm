"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

// Collapse is MANUAL and desktop-only. It never fires off a viewport query:
// below the md breakpoint the sidebar is not displayed in either state, so an
// automatic collapse would be a third state nobody asked for.
//
// IT LIVES AT THE PANEL'S TOP EDGE, NOT IN A FOOTER STRIP (Shell/IA Variant C,
// "Quiet"). The footer strip was a whole band stacked under the nav and the
// New Lead CTA, and three bands is what made the bottom of the rail read busy.
// Collapse is a property of the panel, so the panel's own edge is the more
// truthful place for it.
//
// Expanded, it sits over the right end of the workspace row. It sits INSIDE the
// edge rather than straddling it, because the <aside> is overflow-hidden — load-
// bearing for the two-layer translate collapse — and anything overhanging would
// be clipped. Collapsed, the 56px row has no second slot beside the centred
// mark, so the same control becomes the first row of the rail instead. Still
// one control, still no band of its own.
//
// A directional chevron rather than a panel glyph: at the panel's edge the
// position already says which panel this is about, and the chevron says which
// way the edge will move.
export function SidebarCollapseToggle() {
  const { collapsed, toggleSidebar } = useShell();

  const Icon = collapsed ? IconChevronRight : IconChevronLeft;
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          onClick={toggleSidebar}
          aria-label={label}
          // aria-expanded, not aria-pressed: this control owns the disclosure
          // of the nav labels, and a screen reader should announce that state
          // rather than "pressed".
          aria-expanded={!collapsed}
          className={cn(
            collapsed
              ? "w-full px-0"
              : "absolute top-1/2 right-2 w-7 -translate-y-1/2 px-0",
          )}
        >
          <Icon className="size-4" stroke={1.75} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
