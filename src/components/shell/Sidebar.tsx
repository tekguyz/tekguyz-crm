"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutGrid, IconLayoutKanban, IconUsers, IconUpload, IconSettings } from "@tabler/icons-react";
import { SidebarQuickAction } from "@/components/shell/SidebarQuickAction";
import { BrandMark } from "@/components/brand/BrandMark";

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
        <span className="text-sm font-semibold tracking-tight">TEKGUYZ CRM</span>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-canvas-soft font-medium text-accent"
                  : "text-ink-muted hover:bg-canvas-soft hover:text-ink-main"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <SidebarQuickAction />
    </aside>
  );
}
