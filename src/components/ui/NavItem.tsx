import Link from "next/link";
import type { ComponentType, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils/cn";

// Structural, so any Tabler icon satisfies it without importing Tabler's own
// type here.
export type NavIcon = ComponentType<{ className?: string; stroke?: number }>;

// One navigation link, three layouts. They are the same component — same
// active rule, same accent rule, same accessible name — worn three ways by the
// shell:
//   row  — the expanded sidebar, and the mobile "More" sheet's nav section
//   rail — the collapsed sidebar; the label is visually hidden but still read
//   tab  — the mobile bottom tab bar, icon stacked over label
// Keeping them in one primitive is deliberate: a second nav component would
// mean a second definition of "you are here" that could drift from this one.
export type NavItemLayout = "row" | "rail" | "tab";

// Presentational only: it never reads the router. The caller owns `active`, so
// this stays testable and reusable outside a route context.
//
// `--accent` on the active item is one of its four sanctioned uses (primary
// CTAs, active nav links, focus rings, inline navigational links). Never use it
// decoratively.
//
// Colour alone is NOT the active signal. Every layout also paints a solid
// --accent marker bar — down the leading edge for row/rail, across the top
// edge for tab — because in the collapsed rail there is no label to carry a
// weight change and a hue shift on a 20px icon is not an unambiguous answer to
// "which page am I on".
const LAYOUTS: Record<NavItemLayout, string> = {
  row: "text-body-md flex items-center gap-2 rounded-md px-3 py-2",
  rail: "flex items-center justify-center rounded-md p-2",
  tab: "text-caption flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5",
};

const MARKERS: Record<NavItemLayout, string> = {
  row: "before:absolute before:top-1/2 before:left-0 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-accent",
  rail: "before:absolute before:top-1/2 before:left-0 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-accent",
  tab: "before:absolute before:top-0 before:left-1/2 before:h-0.5 before:w-6 before:-translate-x-1/2 before:rounded-full before:bg-accent",
};

export function NavItem({
  href,
  icon: Icon,
  active = false,
  layout = "row",
  className,
  ref,
  children,
  ...props
}: {
  href: string;
  icon: NavIcon;
  active?: boolean;
  layout?: NavItemLayout;
  className?: string;
  // Forwarded so a Radix `asChild` trigger — the tooltip that reveals a rail
  // item's hidden label — can measure and anchor to the real anchor element.
  // React 19 passes `ref` as an ordinary prop, so no forwardRef wrapper.
  ref?: Ref<HTMLAnchorElement>;
  children: ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children" | "ref">) {
  return (
    <Link
      href={href}
      ref={ref}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative transition-colors",
        LAYOUTS[layout],
        active
          ? cn("bg-canvas-soft font-medium text-accent", MARKERS[layout])
          : "text-ink-muted hover:bg-canvas-soft hover:text-ink-main",
        className,
      )}
      {...props}
    >
      <Icon className="size-5" stroke={1.75} />
      {/* The rail hides the label rather than dropping it, so the link keeps a
          real accessible name for screen readers and the tooltip has something
          truthful to echo. */}
      <span className={cn(layout === "rail" && "sr-only")}>{children}</span>
    </Link>
  );
}
