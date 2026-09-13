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
//
// THE BAR IS AN INSET FLOATING CARD (Shell/IA Variant C, "Quiet"), not a strip
// welded to the screen edge. Content scrolling under a full-bleed strip runs
// into it with only a 1px line between, and on a long list that join reads as
// clipping; a gap reads as a layer. It takes Level-1 elevation, a deliberate
// exception to a ramp that otherwise reserves Level 1 for dropdowns and
// popovers — accepted because the ramp's real rule is "elevation means above
// the page", which is exactly what is true of a bar content passes under.
// Active state is unchanged: accent text plus NavItem's top marker.
export function MobileTabBar({ orgName, userEmail }: { orgName: string; userEmail: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      // z-30 keeps it under the command palette, the profile sheet and any
      // modal, all of which sit at z-40/z-50 and must cover it.
      //
      // The safe-area inset is added to the card's bottom OFFSET rather than to
      // its padding, so the card clears the home indicator instead of growing a
      // fat edge under it. <main>'s pb-24 below md still clears it: the card
      // is ~66px tall plus a 12px offset.
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 flex items-stretch gap-1 rounded-xl border border-hairline bg-canvas-pure p-1.5 shadow-elevation-1 md:hidden"
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
