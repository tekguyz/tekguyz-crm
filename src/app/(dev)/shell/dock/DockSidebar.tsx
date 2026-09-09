"use client";

import type { ShellNavItem } from "@/components/shell/nav-items";
import { Button } from "@/components/ui/Button";
import {
  SidebarRailExpand,
  SidebarWorkspaceRow,
} from "../preview/SidebarChrome";
import { NavItem } from "@/components/ui/NavItem";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { NAV_FOOTER, NAV_GROUPS } from "../preview/nav-groups";

// VARIANT C — "Quiet". The thesis is that the rail says as little as it can
// and still work.
//
// IT USED TO BE CALLED "DOCK", AND THE DOCK IS GONE. The first pass moved
// identity — avatar, name, email, chevron — into a band pinned to the bottom
// of the sidebar. Reviewed on the comp, that band plus the nav footer plus the
// New-lead CTA plus the collapse strip stacked four deep, and the bottom of
// the rail read busier than anything it was meant to fix. Identity went back
// to the header's top-right, where the Plan CRM reference puts it and where
// the shipped shell already has it, and the collapse control moved to the
// panel's top edge. What is left down there is one nav footer and one CTA.
//
// Grouping here has NO captions and NO chevrons. The groups are separated by a
// full-bleed hairline and nothing else — position is the grouping. That reads
// quietest of the three and is the cheapest to keep true, since there is no
// caption to become wrong when a destination changes group. It is also the
// weakest: a new user is told that two clusters exist but never told what
// either one is for.
//
// Everything about the rail's mechanism is unchanged — this is still a 240px
// panel and a 56px rail, still cookie-driven in the shipped shell, still
// showing both states statically here.

// Name kept as DockSidebar so the route path and every import stay put while
// the direction is still being chosen; the variant's DISPLAY name is "Quiet".
export function DockSidebar({
  collapsed,
  activeHref,
  orgName = "TEKGUYZ",
}: {
  collapsed: boolean;
  activeHref: string;
  orgName?: string;
}) {
  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-hairline bg-canvas-pure",
          collapsed ? "w-14" : "w-60",
        )}
      >
        <SidebarWorkspaceRow orgName={orgName} collapsed={collapsed} />

        <nav aria-label="Main" className="flex-1 overflow-y-auto p-2">
          {collapsed ? <SidebarRailExpand /> : null}
          {/* The CTA leads the list rather than sitting in its own footer
              band. It is the most-used control in the rail and this variant is
              short of bands at the bottom. */}
          <Button variant="primary" className={cn("mb-2 w-full", collapsed && "px-0")}>
            <span aria-hidden="true" className="text-body-md leading-none">
              +
            </span>
            <span className={cn(collapsed && "sr-only")}>New lead</span>
          </Button>

          {NAV_GROUPS.map((group, index) => (
            <div
              key={group.caption}
              role="group"
              aria-label={group.caption}
              className={cn(
                "space-y-0.5",
                // -mx-2 bleeds the rule to both edges of the p-2 nav, so it
                // reads as a division of the rail rather than as an underline
                // belonging to the row above it.
                index > 0 && "mt-2 -mx-2 border-t border-hairline px-2 pt-2",
              )}
            >
              {group.items.map((item) => (
                <Row key={item.href} item={item} collapsed={collapsed} active={item.href === activeHref} />
              ))}
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-0.5 border-t border-hairline p-2">
          {NAV_FOOTER.map((item) => (
            <Row key={item.href} item={item} collapsed={collapsed} active={item.href === activeHref} />
          ))}
        </div>

      </aside>
    </TooltipProvider>
  );
}

function Row({
  item,
  collapsed,
  active,
}: {
  item: ShellNavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const node = (
    <NavItem
      href={item.href}
      icon={item.icon}
      active={active}
      layout={collapsed ? "rail" : "row"}
      // One step denser than the shipped row (py-2 → py-1.5). This variant
      // adds a two-line dock at the bottom and has to find the height
      // somewhere; the rows are where it is cheapest, and 32px is still above
      // any pointer-target floor for a desktop-only surface.
      className={cn(!collapsed && "py-1.5")}
    >
      {item.label}
    </NavItem>
  );

  if (!collapsed) return node;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{node}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
