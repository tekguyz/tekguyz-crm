import {
  IconLayoutGrid,
  IconLayoutKanban,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";

import { NavItem } from "@/components/ui/NavItem";
import type { NavIcon } from "@/components/ui/NavItem";

// Real Tabler icons rather than a stub, so this page also proves the structural
// NavIcon type actually accepts them and that stroke 1.75 renders as intended.
// Exactly one item is active per group: --accent on a nav link is a "you are
// here" signal, and two of them would say nothing.
const ITEMS: { href: string; label: string; icon: NavIcon; active?: boolean }[] =
  [
    { href: "/dashboard", label: "Today", icon: IconLayoutGrid },
    {
      href: "/pipeline",
      label: "Pipeline",
      icon: IconLayoutKanban,
      active: true,
    },
    { href: "/contacts", label: "Contacts", icon: IconUsers },
    { href: "/settings", label: "Settings", icon: IconSettings },
  ];

// All three layouts, so the active marker can be compared side by side. The
// marker is the point: colour alone is not the active signal, because the rail
// has no label to carry a weight change.
export function NavSection() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-h2">NavItem — row, rail, tab</h3>

      <div className="flex flex-wrap items-start gap-4">
        <nav className="flex w-52 flex-col gap-1 rounded-lg border border-hairline bg-canvas-pure p-2">
          {ITEMS.map(({ href, label, icon, active }) => (
            <NavItem key={href} href={href} icon={icon} active={active}>
              {label}
            </NavItem>
          ))}
        </nav>

        <nav className="flex w-14 flex-col gap-1 rounded-lg border border-hairline bg-canvas-pure p-2">
          {ITEMS.map(({ href, label, icon, active }) => (
            <NavItem key={href} href={href} icon={icon} active={active} layout="rail">
              {label}
            </NavItem>
          ))}
        </nav>

        <nav className="flex flex-1 items-stretch gap-1 rounded-lg border border-hairline bg-canvas-pure px-2 pt-1 pb-1">
          {ITEMS.map(({ href, label, icon, active }) => (
            <NavItem
              key={href}
              href={href}
              icon={icon}
              active={active}
              layout="tab"
              className="flex-1"
            >
              {label}
            </NavItem>
          ))}
        </nav>
      </div>
    </div>
  );
}
