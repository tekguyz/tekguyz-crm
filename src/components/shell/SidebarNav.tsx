"use client";

import { usePathname } from "next/navigation";

import {
  NAV_FOOTER,
  NAV_GROUPS,
  isNavItemActive,
  type ShellNavItem,
} from "@/components/shell/nav-items";
import { NavItem } from "@/components/ui/NavItem";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

// NavItem is presentational and never reads the router, so active state is
// resolved here.
//
// ONE <nav> LANDMARK, TWO REGIONS. The groups scroll; the footer pair (Reports,
// Settings) is pinned under them. Both live inside the same landmark so a
// screen reader still finds exactly one "Main" navigation on desktop, the same
// as the mobile tab bar gives it on a phone.
//
// Grouping has NO captions and NO disclosure — a full-bleed hairline between
// groups is the whole of it (docs/DESIGN.md § The Application Shell, decision
// 3). Each group is a role="group" carrying its name as aria-label, so what a
// sighted user is told by position a screen reader is told in words.
//
// Collapsed, every item still carries its label as an sr-only span (NavItem's
// "rail" layout), so the link keeps a real accessible name; the tooltip is the
// sighted equivalent of that name and fires on hover AND on keyboard focus,
// which is why it is a Radix tooltip rather than a title attribute.
//
// No outline-none on any row here: it would delete the global :focus-visible
// floor for every destination with no error and no failing test.
export function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {NAV_GROUPS.map((group, index) => (
          <div
            key={group.name}
            role="group"
            aria-label={group.name}
            className={cn(
              "space-y-0.5",
              // -mx-2 bleeds the rule to both edges of the p-2 region, so it
              // reads as a division of the rail rather than as an underline
              // belonging to the row above it.
              index > 0 && "-mx-2 mt-2 border-t border-hairline px-2 pt-2",
            )}
          >
            {group.items.map((item) => (
              <Row
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={isNavItemActive(pathname, item.href)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="shrink-0 space-y-0.5 border-t border-hairline p-2">
        {NAV_FOOTER.map((item) => (
          <Row
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={isNavItemActive(pathname, item.href)}
          />
        ))}
      </div>
    </nav>
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
      // One step denser than NavItem's own row (py-2 → py-1.5, 36px → 32px).
      // Quiet adds a hairline and a pinned footer, and the rows are where the
      // height is cheapest; 32px is still above any pointer-target floor for a
      // desktop-only surface. Expanded only — the rail keeps its square cell.
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
