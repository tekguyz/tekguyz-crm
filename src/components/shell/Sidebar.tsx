"use client";

import { usePathname } from "next/navigation";
import { IconLayoutGrid, IconLayoutKanban, IconUsers, IconUpload, IconSettings } from "@tabler/icons-react";
import { SidebarQuickAction } from "@/components/shell/SidebarQuickAction";
import { BrandMark } from "@/components/brand/BrandMark";
import { NavItem } from "@/components/ui/NavItem";

const NAV_ITEMS = [
  { href: "/", label: "Today", icon: IconLayoutGrid },
  { href: "/pipeline", label: "Pipeline", icon: IconLayoutKanban },
  { href: "/contacts", label: "Contacts", icon: IconUsers },
  { href: "/import", label: "Import", icon: IconUpload },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-hairline bg-canvas-pure">
      <div className="flex h-14 items-center gap-2.5 border-b border-hairline px-4">
        <BrandMark height={22} />
        <span className="text-title">TEKGUYZ CRM</span>
      </div>

      {/* NavItem is presentational and never reads the router, so active state
          is resolved here — the same exact-match rule the hand-rolled links
          used before the v2 swap. */}
      <nav className="flex-1 space-y-0.5 p-2">
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <NavItem key={href} href={href} icon={icon} active={pathname === href}>
            {label}
          </NavItem>
        ))}
      </nav>

      <SidebarQuickAction />
    </aside>
  );
}
