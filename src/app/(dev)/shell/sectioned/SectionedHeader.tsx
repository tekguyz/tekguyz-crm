import { IconChevronDown, IconHelpCircle, IconSearch } from "@tabler/icons-react";

import { DemoModeBadge } from "@/components/shell/DemoModeBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

// VARIANT A header. Two changes to the shipped one, both about density.
//
// 1. 48px instead of 56px. The bar carries one control on each side and 8px of
//    that height was doing nothing; taking it back gives the content area a
//    whole card row on a laptop screen.
//
// 2. The search trigger takes a FIELD's silhouette — fixed 256px, contents
//    left-aligned, the keycap pushed to the right edge — while staying the
//    same Button opening the same palette. The shipped trigger is
//    content-width, which reads as a small button sitting in a lot of empty
//    bar; that emptiness is most of what "huge and plain" is describing. A
//    field shape at a fixed width fills the space it is given without
//    reintroducing an actual input, which decision 1 of docs/DESIGN.md § The
//    Application Shell rules out for good reasons that have not changed.
//
// The right side gains the reference's cluster: one icon control, a hairline
// divider, then identity. Help moves OUT of the identity menu and back onto
// the bar, because at 48px there is room for exactly one utility glyph and
// Help is the one a first-week user reaches for. Theme and sign out stay in
// the menu.
//
// The demo badge keeps a home beside the search trigger, under the same
// `min-w-0` wrapper the shipped header uses so it can never squeeze the
// trigger off a narrow bar.
export function SectionedHeader({
  displayName,
  userEmail,
  isDemo = false,
}: {
  displayName: string | null;
  userEmail: string;
  isDemo?: boolean;
}) {
  const name = displayName || userEmail;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-canvas-pure px-4">
      <div className="flex min-w-0 items-center gap-2">
        {/* min-w-0 lets the 256px trigger give way before the badge does. The
            badge is a fixed, short string and wraps to two lines the moment it
            is allowed to shrink — measured in the browser at an 800px frame,
            where it read "Read-" over "only". */}
        <Button variant="secondary" className="w-64 min-w-0 justify-start gap-2">
          <IconSearch className="size-5 shrink-0 text-ink-muted" stroke={1.75} />
          <span className="truncate text-ink-muted">Search</span>
          <kbd className="text-label ml-auto hidden rounded-sm border border-hairline px-1.5 py-0.5 text-ink-muted md:inline">
            ⌘K
          </kbd>
        </Button>
        {isDemo ? (
          <span className="shrink-0 whitespace-nowrap">
            <DemoModeBadge />
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" aria-label="Help" className="w-8 px-0">
          <IconHelpCircle className="size-5" stroke={1.75} />
        </Button>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-hairline" />
        <Button
          variant="ghost"
          aria-label={`Account menu for ${name}`}
          className="gap-2 pr-1.5 pl-1.5"
        >
          <Avatar size="sm" name={name} />
          <span className="hidden max-w-32 truncate sm:inline">{name}</span>
          <IconChevronDown className="size-4 text-ink-muted" stroke={1.75} />
        </Button>
      </div>
    </header>
  );
}
