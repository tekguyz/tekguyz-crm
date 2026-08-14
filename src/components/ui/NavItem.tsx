import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

// Structural, so any Tabler icon satisfies it without importing Tabler's own
// type here.
export type NavIcon = ComponentType<{ className?: string; stroke?: number }>;

// Presentational only: it never reads the router. The caller owns `active`, so
// this stays testable and reusable outside a route context.
//
// `--accent` on the active item is one of its four sanctioned uses (primary
// CTAs, active nav links, focus rings, inline navigational links). Never use it
// decoratively.
export function NavItem({
  href,
  icon: Icon,
  active = false,
  className,
  children,
}: {
  href: string;
  icon: NavIcon;
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "text-body-md flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
        active
          ? "bg-canvas-soft font-medium text-accent"
          : "text-ink-muted hover:bg-canvas-soft hover:text-ink-main",
        className,
      )}
    >
      <Icon className="size-5" stroke={1.75} />
      {children}
    </Link>
  );
}
