"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, KanbanSquare, Users, Settings } from "lucide-react";
import { SidebarQuickAction } from "@/components/shell/SidebarQuickAction";

const NAV_ITEMS = [
  { href: "/", label: "Today", icon: LayoutGrid },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-hairline bg-canvas-pure">
      <div className="flex h-14 items-center border-b border-hairline px-4">
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
