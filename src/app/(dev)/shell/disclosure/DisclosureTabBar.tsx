import { IconDots } from "@tabler/icons-react";

import { PRIMARY_NAV } from "@/components/shell/nav-items";
import { Button } from "@/components/ui/Button";
import { NavItem } from "@/components/ui/NavItem";
import { cn } from "@/lib/utils/cn";

// VARIANT B tab bar. Still four slots; the width is redistributed between them.
//
// Inactive slots drop to icon-only and the active slot expands into a
// horizontal accent pill carrying icon and label side by side. The bar stops
// being four identical stacks and starts having a subject. It also gives the
// active label real size — 11px stacked under a 20px icon is the smallest type
// in the app, at the bottom of the screen, in a thumb's shadow.
//
// The labels are hidden, not deleted: an inactive slot uses NavItem's `rail`
// layout, which keeps the label as an sr-only span, so every tab still has a
// real accessible name. That is the same mechanism the collapsed desktop rail
// uses, reused rather than re-invented.
//
// The cost is honest and belongs in the comparison: three of four destinations
// are now unlabelled, and these five icons have to be learnable on their own.
// Variant A keeps every label and pays for it in width.
export function DisclosureTabBar({
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

        return active ? (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            layout="tab"
            active
            // flex-row overrides `tab`'s flex-col through cn(); flex-[2] gives
            // the pill twice an inactive slot's share so the label has room
            // without the icons crowding.
            className="text-body-sm flex-[2] flex-row gap-2 bg-accent/12 px-3"
          >
            {item.label}
          </NavItem>
        ) : (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            layout="rail"
            className="flex-1"
          >
            {item.label}
          </NavItem>
        );
      })}

      <Button variant="ghost" aria-label="More" className="w-auto flex-1 px-0">
        <IconDots className="size-5" stroke={1.75} />
      </Button>
    </nav>
  );
}
