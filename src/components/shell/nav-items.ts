import {
  IconLayoutGrid,
  IconLayoutKanban,
  IconUsers,
  IconChartBar,
  IconUpload,
  IconTargetArrow,
  IconSettings,
} from "@tabler/icons-react";

import type { NavIcon } from "@/components/ui/NavItem";

export type ShellNavItem = { href: string; label: string; icon: NavIcon };

// The shell's navigation has NO NESTING — no children, no disclosure
// triangles, at any width. When Saved Views ships it belongs in the content
// area as a view switcher above the table, not as sidebar children. This is a
// deliberate divergence from Twenty CRM, which nests views in the sidebar and
// gets noisy fast. (Since 2026-09-13 the desktop sidebar GROUPS destinations
// by position — see NAV_GROUPS below — but a group is never a parent.)
//
// PRIMARY vs SECONDARY is NOT the desktop sidebar's arrangement — the sidebar
// reads NAV_GROUPS and NAV_FOOTER. The split exists solely because the mobile
// bottom tab bar has exactly four slots and the fourth is "More": PRIMARY
// fills the three real tabs, SECONDARY lives in the More sheet.
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
  // Cold outreach, deliberately separate from Import: that one writes leads,
  // this one writes prospects, and the two files look nothing alike. Sits in
  // SECONDARY like every other job-you-do-once destination; the mobile tab
  // bar's four slots are not reopened by it.
  //
  // Points at the call list, not at /prospects/import — importing is a job you
  // do once a week, working the list is the daily one. The importer is reached
  // by a button on the list page. isNavItemActive is an EXACT match, so this
  // entry correctly does NOT light up while you are on /prospects/import.
  { href: "/prospects", label: "Prospects", icon: IconTargetArrow },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

export const ALL_NAV: ShellNavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV];

// THE DESKTOP SIDEBAR'S ARRANGEMENT — Shell/IA Variant C, "Quiet" (picked
// 2026-09-07, wired 2026-09-13). This replaced "flat, permanently": the seven
// destinations are now two position-only groups and a footer pair. There are
// NO captions and NO disclosure — a full-bleed hairline between groups is the
// whole of the grouping, so there is no label to go stale when a destination
// moves. See docs/DESIGN.md § The Application Shell, decision 3.
//
// Every entry is looked up out of PRIMARY_NAV / SECONDARY_NAV by href and a
// miss throws at module load, so the sidebar cannot invent a route or silently
// drop one. nav-items.test.ts pins that the groups and the footer together
// hold ALL_NAV exactly once each.
//
// The mobile tab bar does NOT read these. Its four slots are still PRIMARY_NAV
// plus More, a standing decision this arrangement does not reopen.
function byHref(href: string): ShellNavItem {
  const item = ALL_NAV.find((i) => i.href === href);
  if (!item) throw new Error(`No shell nav item for ${href}`);
  return item;
}

export type ShellNavGroup = {
  // Never rendered visibly. It is the accessible name of the group's
  // role="group" wrapper, so a screen reader is told what a sighted user is
  // shown by position.
  name: string;
  items: ShellNavItem[];
};

// Work is the hourly loop: what is due, the board, a person's number.
// Prospecting is the weekly loop: load a list, then work it.
export const NAV_GROUPS: ShellNavGroup[] = [
  { name: "Work", items: [byHref("/"), byHref("/pipeline"), byHref("/contacts")] },
  { name: "Prospecting", items: [byHref("/prospects"), byHref("/import")] },
];

// Reports and Settings are the step-back destinations, visited weekly rather
// than hourly, so they are pinned to the bottom of the rail instead of padding
// out a one-item third group. Settings stays a sidebar destination and is
// never moved into the avatar menu: it is a real page with org details,
// members, webhooks and API keys behind it, and a destination buried in an
// account popover cannot be found or linked.
export const NAV_FOOTER: ShellNavItem[] = [byHref("/reports"), byHref("/settings")];

// Exact match, the same rule the shell has always used. "/" is a real route
// here, so a prefix match would light Today up on every page.
export function isNavItemActive(pathname: string, href: string) {
  return pathname === href;
}

// The header's page title. It is the nav label of the route you are on, so it
// can never disagree with the sidebar. An exact match wins; otherwise the
// longest nav href that prefixes the path, so /prospects/import reads
// "Prospects" — "/" is excluded from the prefix pass or it would title every
// page "Today". A path no destination owns gets no title rather than a wrong
// one.
export function pageTitleFor(pathname: string): string | null {
  const exact = ALL_NAV.find((item) => item.href === pathname);
  if (exact) return exact.label;

  const parent = ALL_NAV.filter(
    (item) => item.href !== "/" && pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];

  return parent ? parent.label : null;
}
