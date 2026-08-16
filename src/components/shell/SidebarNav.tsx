"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";

import { ALL_NAV, isNavItemActive } from "@/components/shell/nav-items";
import { NavItem } from "@/components/ui/NavItem";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// NavItem is presentational and never reads the router, so active state is
// resolved here.
//
// Collapsed, every item still carries its label as an sr-only span (NavItem's
// "rail" layout), so the link keeps a real accessible name; the tooltip is the
// sighted equivalent of that name and fires on hover AND on keyboard focus,
// which is why it is a Radix tooltip rather than a title attribute.
export function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto p-2">
      {ALL_NAV.map(({ href, label, icon }) => {
        const active = isNavItemActive(pathname, href);

        const item = (
          <NavItem
            href={href}
            icon={icon}
            active={active}
            layout={collapsed ? "rail" : "row"}
          >
            {label}
          </NavItem>
        );

        // Fragment, not a wrapper <div>: space-y-0.5 spaces direct children,
        // and an extra element would swallow the gap between rows.
        if (!collapsed) return <Fragment key={href}>{item}</Fragment>;

        return (
          <Tooltip key={href}>
            <TooltipTrigger asChild>{item}</TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
