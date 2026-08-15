import { cn } from "@/lib/utils/cn";

// The mark's two colour variants and the size threshold between the full and
// reduced forms are brand rules, not styling choices — see CLAUDE.md. This
// component is the only place either is encoded, so a caller picks a size and
// gets the correct asset automatically instead of having to remember both
// rules at every call site.
//
// Rendered as a background-image driven by --brand-mark / --brand-mark-reduced,
// which .light and .dark redefine in globals.css. That is what makes the
// theme swap work inside the nested theme panes on /design, where a class
// based `dark:` variant would not.

// Below 40px the nodes cannot resolve, so the reduced form (funnel + arrow)
// takes over. 32px is the documented cutover point.
const REDUCED_MAX = 32;

// Intrinsic aspect of each asset, needed to reserve the right width from a
// caller-supplied height. The reduced mark is notably wider than the full one.
const RATIO = { full: 422 / 428, reduced: 455 / 341 };

export function BrandMark({
  height = 24,
  className,
}: {
  height?: number;
  className?: string;
}) {
  const reduced = height <= REDUCED_MAX;
  const variant = reduced ? "reduced" : "full";

  return (
    <span
      aria-hidden="true"
      className={cn("block shrink-0 bg-contain bg-center bg-no-repeat", className)}
      style={{
        backgroundImage: `var(${reduced ? "--brand-mark-reduced" : "--brand-mark"})`,
        height,
        width: Math.round(height * RATIO[variant]),
      }}
    />
  );
}
