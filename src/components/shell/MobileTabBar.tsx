"use client";

import { usePathname } from "next/navigation";

import { MobileMoreSheet } from "@/components/shell/MobileMoreSheet";
import { PRIMARY_NAV, isNavItemActive } from "@/components/shell/nav-items";
import { NavItem } from "@/components/ui/NavItem";

// Mobile is NOT a collapsed sidebar. Below md the sidebar is not displayed in
// either collapse state and this is the whole of navigation: three real
// destinations plus More. `md:hidden` here and `hidden md:flex` on the sidebar
// make the two mutually exclusive at every width — never both, never neither.
//
// Triage-first: the phone cases are reading today's work, starring, tapping a
// number, and nudging a status. Those live behind Today, Pipeline and
// Contacts. Full CRUD stays reachable — every route is one or two taps away —
// but it is not what these three slots are optimised for.
export function MobileTabBar({ orgName, userEmail }: { orgName: string; userEmail: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      // z-30 keeps it under the command palette, the profile sheet and any
      // modal, all of which sit at z-40/z-50 and must cover it.
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch gap-1 border-t border-hairline bg-canvas-pure px-2 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] md:hidden"
    >
      {PRIMARY_NAV.map(({ href, label, icon }) => (
        <NavItem
          key={href}
          href={href}
          icon={icon}
          layout="tab"
          active={isNavItemActive(pathname, href)}
          className="flex-1"
        >
          {label}
        </NavItem>
      ))}
      <MobileMoreSheet orgName={orgName} userEmail={userEmail} />
    </nav>
  );
}
