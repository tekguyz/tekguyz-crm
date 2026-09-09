import { IconChevronDown, IconHelpCircle, IconSearch } from "@tabler/icons-react";

import { DemoModeBadge } from "@/components/shell/DemoModeBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

// VARIANT B header — the reference's own shape.
//
// The search trigger is the bar: flex-1 up to 28rem, left-aligned, keycap at
// the right edge. Where Variant A gives the trigger a fixed 256px field
// silhouette, this one lets it absorb whatever width the header has, so the
// emptiness that reads as "plain" is spent on the control people actually use
// rather than left as gap. It is still a Button opening the palette — no input
// is reintroduced.
//
// Identity is avatar-and-chevron only, no name, behind a full-height hairline
// divider. The name is not lost: it is the button's accessible name and the
// first line of the menu it opens. Dropping it from the bar is what buys the
// search trigger its width, and it is the treatment the reference uses.
//
// Help sits beside identity as a single icon control, the one utility glyph
// the bar earns.
export function DisclosureHeader({
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
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline bg-canvas-pure px-4">
      <Button variant="secondary" className="min-w-0 flex-1 justify-start gap-2 md:max-w-[28rem]">
        <IconSearch className="size-5 shrink-0 text-ink-muted" stroke={1.75} />
        <span className="truncate text-ink-muted">Search or jump to…</span>
        <kbd className="text-label ml-auto hidden shrink-0 rounded-sm border border-hairline px-1.5 py-0.5 text-ink-muted md:inline">
          ⌘K
        </kbd>
      </Button>

      {isDemo ? (
          <span className="shrink-0 whitespace-nowrap">
            <DemoModeBadge />
          </span>
        ) : null}

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" aria-label="Help" className="w-8 px-0">
          <IconHelpCircle className="size-5" stroke={1.75} />
        </Button>
        {/* Full header height, the way the reference draws it: the divider
            reads as a seam between two regions of the bar rather than as a
            spacer between two buttons. */}
        <span aria-hidden="true" className="mx-2 h-14 w-px self-center bg-hairline" />
        <Button
          variant="ghost"
          aria-label={`Account menu for ${name}`}
          className="gap-1.5 pr-1.5 pl-1.5"
        >
          <Avatar name={name} />
          <IconChevronDown className="size-4 text-ink-muted" stroke={1.75} />
        </Button>
      </div>
    </header>
  );
}
