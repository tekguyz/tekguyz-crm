"use client";

import {
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";

import { WorkspaceBlock } from "@/components/shell/WorkspaceBlock";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

// THE COLLAPSE CONTROL MOVES TO THE SIDEBAR'S TOP EDGE, WHICH IS WHERE THE
// PLAN CRM REFERENCE PUTS IT (the circled chevron).
//
// It used to be a footer strip with its own top hairline. That strip was the
// third band stacked at the bottom of the rail, under the nav footer and the
// New-lead CTA, and three bands is what made the bottom read as busy. Moving
// the control up removes a whole band and costs nothing: collapse is a
// property of the panel, so the panel's own edge is a more truthful place for
// it than the end of a list of destinations.
//
// It sits INSIDE the right edge rather than straddling it. The reference draws
// a circle half-outside the panel, which is a nicer handle — but the shipped
// <aside> is `overflow-hidden`, load-bearing for the two-layer translate
// collapse (docs/DESIGN.md § The Application Shell, decision 4), so anything
// overhanging the right edge would be clipped away. Sitting inside is the
// version that survives the mechanism this exploration is not allowed to
// touch.
//
// THE ICON IS A DIRECTIONAL CHEVRON, NOT THE PANEL GLYPH. At the panel's edge
// a chevron says which way the edge will move; the shipped
// IconLayoutSidebarLeftCollapse says "this is about the sidebar", which is
// information the position now carries on its own.
//
// Collapsed, the chevron cannot share the workspace row — the mark is centred
// there and 56px has no second slot — so it becomes the first item of the
// rail instead. Still one control, still no extra band, still no border of
// its own.
//
// SHIPPING NOTE: WorkspaceBlock is untouched, per this prompt's scope fence,
// so the toggle is absolutely positioned over its row. That is safe at the
// org names in play but a long name would slide under the button, because
// WorkspaceBlock owns its own px-4 and cannot be given right padding from
// out here. Shipping this needs one prop on WorkspaceBlock, not a rewrite.

export function SidebarWorkspaceRow({
  orgName,
  collapsed,
}: {
  orgName: string;
  collapsed: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <WorkspaceBlock orgName={orgName} collapsed={collapsed} />
      {collapsed ? null : (
        <Button
          variant="ghost"
          aria-label="Collapse sidebar"
          aria-expanded
          className="absolute top-1/2 right-2 w-7 -translate-y-1/2 px-0"
        >
          <IconChevronLeft className="size-4" stroke={1.75} />
        </Button>
      )}
    </div>
  );
}

// The rail's expand control. Rendered as the first row of the nav so it needs
// no band and no hairline of its own.
export function SidebarRailExpand({ className }: { className?: string }) {
  return (
    <Button
      variant="ghost"
      aria-label="Expand sidebar"
      aria-expanded={false}
      className={cn("mb-1 w-full px-0", className)}
    >
      <IconChevronRight className="size-4" stroke={1.75} />
    </Button>
  );
}
