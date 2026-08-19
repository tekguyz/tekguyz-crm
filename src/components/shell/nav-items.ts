import {
  IconLayoutGrid,
  IconLayoutKanban,
  IconUsers,
  IconChartBar,
  IconUpload,
  IconSettings,
} from "@tabler/icons-react";

import type { NavIcon } from "@/components/ui/NavItem";

export type ShellNavItem = { href: string; label: string; icon: NavIcon };

// The shell's navigation is FLAT — no nesting, no groups, no disclosure
// triangles, at any width. When Saved Views ships it belongs in the content
// area as a view switcher above the table, not as sidebar children. This is a
// deliberate divergence from Twenty CRM, which nests views in the sidebar and
// gets noisy fast.
//
// PRIMARY vs SECONDARY is NOT a hierarchy in the sidebar — the desktop sidebar
// renders both arrays as one unbroken list. The split exists solely because
// the mobile bottom tab bar has exactly four slots and the fourth is "More":
// PRIMARY fills the three real tabs, SECONDARY lives in the More sheet.
//
// Triage-first ordering, mobile included: the three destinations you reach for
// while holding a phone between calls are today's work, the board, and a
// person's number.

export const PRIMARY_NAV: ShellNavItem[] = [
  { href: "/", label: "Today", icon: IconLayoutGrid },
  { href: "/pipeline", label: "Pipeline", icon: IconLayoutKanban },
  { href: "/contacts", label: "Contacts", icon: IconUsers },
];

export const SECONDARY_NAV: ShellNavItem[] = [
  // First in SECONDARY, ahead of Import: Reports is a place you go to read,
  // Import is a job you do once, and Settings stays last where people expect
  // it. The primary bar's three tabs are not reopened by this — Reports is
  // something you check between weeks, not between calls.
  { href: "/reports", label: "Reports", icon: IconChartBar },
  { href: "/import", label: "Import", icon: IconUpload },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

export const ALL_NAV: ShellNavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV];

// Exact match, the same rule the shell has always used. "/" is a real route
// here, so a prefix match would light Today up on every page.
export function isNavItemActive(pathname: string, href: string) {
  return pathname === href;
}
