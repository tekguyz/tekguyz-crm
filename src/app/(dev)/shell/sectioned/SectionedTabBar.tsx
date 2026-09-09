import { IconDots } from "@tabler/icons-react";

import { PRIMARY_NAV } from "@/components/shell/nav-items";
import { Button } from "@/components/ui/Button";
import { NavItem } from "@/components/ui/NavItem";
import { cn } from "@/lib/utils/cn";

// VARIANT A tab bar. Four slots, unchanged. What changes is what "active"
// looks like.
//
// Today the active tab is a `canvas-soft` fill on a `canvas-pure` bar — a
// 1.06:1 difference, which is the same near-invisible tint the identity menu
// rows were once left with. The top marker is carrying the whole signal on its
// own, and it is 2px tall at the very edge of a thumb-height bar.
//
// Here the active slot gets an accent-tinted plate behind the icon and label.
// That is `--accent` in its sanctioned "active nav" role, at 12% so it reads
// as a surface rather than a button, with the marker and the accent label kept
// exactly as they are — three cues, not a replacement of the two that exist.
// The bar also gains 4px of vertical padding, which is what stops the plate
// from touching the bar's own edges.
//
// The default className is the shipped bar's own positioning, so this renders
// in the real place in a real app; PhoneFrame passes an override to pin it
// inside a 375px box on a desktop-width page.
export function SectionedTabBar({
  activeHref,
  className,
}: {
  activeHref: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="Main"
      className={cn(
        "inset-x-0 bottom-0 z-30 flex items-stretch gap-1 border-t border-hairline bg-canvas-pure px-2 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]",
        "fixed md:hidden",
        className,
      )}
    >
      {PRIMARY_NAV.map((item) => {
        const active = item.href === activeHref;
        return (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            layout="tab"
            active={active}
            className={cn("flex-1 py-2", active && "bg-accent/12")}
          >
            {item.label}
          </NavItem>
        );
      })}

      {/* The More trigger mirrors the tab shape rather than being a NavItem:
          it opens a Sheet, it is not a destination, and it is never "active". */}
      <Button
        variant="ghost"
        aria-label="More"
        className="text-caption h-auto flex-1 flex-col gap-1 rounded-md px-2 py-2 font-normal"
      >
        <IconDots className="size-5" stroke={1.75} />
        More
      </Button>
    </nav>
  );
}
