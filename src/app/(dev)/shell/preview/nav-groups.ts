import {
  PRIMARY_NAV,
  SECONDARY_NAV,
  type ShellNavItem,
} from "@/components/shell/nav-items";

// The SAME seven destinations the shipped shell has, arranged into groups.
// Nothing here invents a route: every entry is looked up out of PRIMARY_NAV or
// SECONDARY_NAV by href, so a typo is a build-time crash rather than a comp
// quietly showing a page that does not exist.
//
// All three variants share this grouping and differ only in how they PRESENT
// it — static captions, collapsible parents, or spatial position. That is
// deliberate: if the grouping itself changed per variant, the screenshots
// would be comparing two things at once and none of them would answer whether
// grouping is worth having.
//
// THE GROUPING ITSELF IS THE OPEN QUESTION. docs/DESIGN.md § The Application
// Shell decision 3 currently says the sidebar is flat "permanently ... at any
// width, ever". These comps exist to put a real alternative in front of that
// decision; nothing here changes the shipped shell.

function byHref(href: string): ShellNavItem {
  const item = [...PRIMARY_NAV, ...SECONDARY_NAV].find((i) => i.href === href);
  if (!item) throw new Error(`No shell nav item for ${href}`);
  return item;
}

export type NavGroup = {
  /** Uppercase caption. Also the accessible name of the group's own list. */
  caption: string;
  items: ShellNavItem[];
};

// WORK is the hourly loop: what is due, the board, a person's number.
// PROSPECTING is the weekly loop: load a list, then work it.
export const NAV_GROUPS: NavGroup[] = [
  {
    caption: "Work",
    items: [byHref("/"), byHref("/pipeline"), byHref("/contacts")],
  },
  {
    caption: "Prospecting",
    items: [byHref("/prospects"), byHref("/import")],
  },
];

// Reports and Settings are the two "step back from the work" destinations —
// visited weekly, not hourly — so they cluster in the sidebar footer instead
// of padding out a one-item third group. This is also where the Plan CRM
// reference pins its own footer pair.
export const NAV_FOOTER: ShellNavItem[] = [byHref("/reports"), byHref("/settings")];

// Flattened, in render order, for the variants that need one list.
export const GROUPED_NAV: ShellNavItem[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  ...NAV_FOOTER,
];
