import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/utils/cn";

// The sidebar's identity block: which workspace am I in.
//
// SLOT RESERVED, SWITCHER NOT BUILT. There is no persisted "active org"
// concept in the schema — `organization_members` can hold several rows for one
// user, but nothing records which one is current — so an org switcher is a
// feature with a migration behind it, not a menu. This renders static content
// on purpose.
//
// What it does do is take the shape a trigger will need: one element, the mark
// and the name inside it, sized and padded as a row. Turning it into a menu
// later is a matter of wrapping this in <DropdownMenuTrigger asChild> and
// swapping the <div> for a Button — no restructuring of the sidebar around it.
// Do not add switching behaviour, a route, a column or a query here first.
//
// `className` exists for one caller and one reason: the Quiet sidebar lays its
// collapse chevron over this row's right edge, and only this element can give
// its own name room to truncate before it slides under that button. It is
// layout only — no switching, no behaviour.
export function WorkspaceBlock({
  orgName,
  collapsed,
  className,
}: {
  orgName: string;
  collapsed: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center border-b border-hairline",
        collapsed ? "justify-center px-2" : "gap-2.5 px-4",
        className,
      )}
    >
      <BrandMark height={22} />
      {/* Hidden rather than dropped when collapsed, so the workspace still has
          a name in the accessibility tree at both widths. */}
      <span className={cn("text-title truncate", collapsed && "sr-only")}>{orgName}</span>
    </div>
  );
}
