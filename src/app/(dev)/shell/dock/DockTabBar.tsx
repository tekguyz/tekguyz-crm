import { IconDots } from "@tabler/icons-react";

import { PRIMARY_NAV } from "@/components/shell/nav-items";
import { Button } from "@/components/ui/Button";
import { NavItem } from "@/components/ui/NavItem";
import { cn } from "@/lib/utils/cn";

// VARIANT C tab bar. Every label stays; the bar itself stops being a strip.
//
// It lifts off the screen edge into an inset, fully rounded card with a
// hairline all the way round and Level-1 elevation. That is a deliberate
// exception to the elevation ramp, which reserves Level 1 for dropdowns and
// popovers — and it is the thing to argue about when comparing the three. The
// case for it: this bar floats over scrolling content, and the ramp's actual
// rule is that elevation means "above the page", which is exactly what is true
// here and is not true of a strip welded to the bottom border. The case
// against: the ramp is short on purpose, and a fourth thing at Level 1 makes
// it mean less.
//
// The inset also solves something the flush bar cannot: content scrolling
// underneath a full-bleed strip runs into it edge to edge with only a 1px line
// between, and on a long list the join reads as clipping. A gap reads as a
// layer.
//
// Active state is unchanged from the shipped bar — accent text plus the top
// marker — because with the card carrying the visual interest, an accent plate
// as well would be two decorations competing.
export function DockTabBar({
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
        // The safe-area inset is added to the card's own bottom offset rather
        // than to its padding, so the card clears the home indicator instead
        // of growing a fat edge under it.
        "inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 flex items-stretch gap-1 rounded-xl border border-hairline bg-canvas-pure p-1.5 shadow-elevation-1",
        "fixed md:hidden",
        className,
      )}
    >
      {PRIMARY_NAV.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          layout="tab"
          active={item.href === activeHref}
          className="flex-1 py-1.5"
        >
          {item.label}
        </NavItem>
      ))}

      <Button
        variant="ghost"
        aria-label="More"
        className="text-caption h-auto flex-1 flex-col gap-1 rounded-md px-2 py-1.5 font-normal"
      >
        <IconDots className="size-5" stroke={1.75} />
        More
      </Button>
    </nav>
  );
}
