"use client";

import { useId } from "react";
import type { ShellNavItem } from "@/components/shell/nav-items";
import {
  SidebarRailExpand,
  SidebarWorkspaceRow,
} from "../preview/SidebarChrome";
import { Button } from "@/components/ui/Button";
import { NavItem } from "@/components/ui/NavItem";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { NAV_FOOTER, NAV_GROUPS } from "../preview/nav-groups";

// VARIANT A — "Sectioned". Grouping with no interaction attached to it.
//
// Captions are static text, not disclosure triggers: the seven destinations
// already fit on one screen at any height this app runs at, so a chevron would
// buy nothing and charge a click. What grouping buys is a shorter scan — three
// short lists instead of one seven-long one — and captions deliver that on
// their own.
//
// Collapsed, the captions cannot survive 56px, so the grouping degrades to
// hairline rules between the groups. The rule is the caption's silhouette: the
// same three clusters, in the same order, with the name dropped. The group
// keeps its accessible name either way — the caption stays in the DOM as
// sr-only, which is the same trick WorkspaceBlock uses for the org name.
//
// Settings and Reports sit in a pinned footer above the CTA. Both are weekly
// destinations rather than hourly ones, and pairing them there is what keeps
// Reports from becoming a one-item third group.

export function SectionedSidebar({
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
          {NAV_GROUPS.map((group, index) => (
            <NavGroupBlock
              key={group.caption}
              caption={group.caption}
              collapsed={collapsed}
              activeHref={activeHref}
              items={group.items}
              // The first group needs no separator — the WorkspaceBlock's own
              // bottom hairline is already directly above it.
              divided={index > 0}
            />
          ))}
        </nav>

        <div className="shrink-0 space-y-0.5 border-t border-hairline p-2">
          {NAV_FOOTER.map((item) => (
            <RailAwareItem
              key={item.href}
              item={item}
              collapsed={collapsed}
              active={item.href === activeHref}
            />
          ))}
        </div>

        {/* Stands in for SidebarQuickAction. The shipped one renders
            CreateLeadModal, which owns a real Server Action; a comp must not
            mount that, so this is the same slot with an inert Button in it. */}
        <div className="shrink-0 border-t border-hairline p-2">
          <Button variant="primary" className={cn("w-full", collapsed && "px-0")}>
            <span aria-hidden="true" className="text-body-md leading-none">
              +
            </span>
            <span className={cn(collapsed && "sr-only")}>New lead</span>
          </Button>
        </div>

      </aside>
    </TooltipProvider>
  );
}

function NavGroupBlock({
  caption,
  items,
  collapsed,
  activeHref,
  divided,
}: {
  caption: string;
  items: ShellNavItem[];
  collapsed: boolean;
  activeHref: string;
  divided: boolean;
}) {
  const captionId = useId();

  return (
    <div
      role="group"
      aria-labelledby={captionId}
      className={cn(divided && (collapsed ? "mt-2 border-t border-hairline pt-2" : "mt-4"))}
    >
      <p
        id={captionId}
        className={cn(
          "text-label px-3 pb-1 text-ink-muted uppercase",
          // Hidden rather than dropped: the group keeps a real accessible name
          // in the rail, where the hairline above it is the only visual cue.
          collapsed && "sr-only",
        )}
      >
        {caption}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <RailAwareItem
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={item.href === activeHref}
          />
        ))}
      </div>
    </div>
  );
}

// One nav row, wrapped in the rail tooltip when the labels are hidden — the
// same pairing SidebarNav ships, so the collapsed state keeps a sighted label
// on hover AND on keyboard focus.
function RailAwareItem({
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
