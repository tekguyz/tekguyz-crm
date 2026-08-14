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
// Exactly one item is active: --accent on a nav link is a "you are here"
// signal, and two of them would say nothing.
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

export function NavSection() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-h2">NavItem</h3>
      <nav className="flex w-52 flex-col gap-1 rounded-lg border border-hairline bg-canvas-pure p-2">
        {ITEMS.map(({ href, label, icon, active }) => (
          <NavItem key={href} href={href} icon={icon} active={active}>
            {label}
          </NavItem>
        ))}
      </nav>
    </div>
  );
}
