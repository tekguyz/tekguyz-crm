import { IconChevronDown, IconHelpCircle, IconSearch } from "@tabler/icons-react";

import { DemoModeBadge } from "@/components/shell/DemoModeBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

// VARIANT C header — 48px, and it holds a page title.
//
// It becomes the page's own strip: the current destination's name on the left,
// then the global controls on the right in the reference's order — Help,
// search, a seam, identity hard right.
//
// The title is not new information — it is the nav label of the route you are
// on, so it comes out of nav-items and can never disagree with the sidebar.
// What it buys is a header that is about the page instead of about the app,
// which is the difference between a small header and an empty one. That is
// what lets this bar be 8px shorter than the shipped one while carrying more.
//
// This is the variant that argues against docs/DESIGN.md § The Application
// Shell decision 2 ("the header holds exactly two things"). It holds four, and
// is still smaller than the one that holds two, because one of them is text
// and two of them are 32px glyphs.
//
// AN EARLIER PASS PUT IDENTITY IN THE SIDEBAR FOOTER INSTEAD. It came back
// here on review: the footer already carried the nav footer and the New-lead
// CTA, and a third band made the bottom of the rail the busiest region on the
// screen. Top-right is also where the reference puts it, where the shipped
// shell puts it, and — unlike the sidebar — it is a place that still exists on
// a phone.
export function DockHeader({
  title,
  displayName,
  userEmail,
  isDemo = false,
}: {
  title: string;
  displayName: string | null;
  userEmail: string;
  isDemo?: boolean;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-canvas-pure px-4">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="text-title truncate">{title}</h1>
        {isDemo ? (
          <span className="shrink-0 whitespace-nowrap">
            <DemoModeBadge />
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {/* ORDER IS THE REFERENCE'S: utility glyphs, then a seam, then
            identity, hard right. Help is an icon button rather than a row
            inside the avatar menu because it is the one control a first-week
            user reaches for and a menu hides it behind a click. Settings is
            deliberately NOT in that menu either — it is a destination with org
            details, members, webhooks and API keys behind it, so it belongs in
            the nav where it can be found and linked, not in an account
            popover. The avatar menu keeps only account-scoped things: who you
            are signed in as, theme, sign out. */}
        <Button variant="ghost" aria-label="Help" className="w-8 px-0">
          <IconHelpCircle className="size-5" stroke={1.75} />
        </Button>
        {/* Compact by design: at 44px the trigger is a glyph plus its shortcut,
            and the word "Search" would be the first thing to overflow on a
            narrow bar. The accessible name carries it instead. */}
        <Button variant="secondary" aria-label="Search" className="gap-2">
          <IconSearch className="size-5 text-ink-muted" stroke={1.75} />
          <kbd className="text-label hidden rounded-sm border border-hairline px-1.5 py-0.5 text-ink-muted md:inline">
            ⌘K
          </kbd>
        </Button>

        <span aria-hidden="true" className="mx-1 h-5 w-px bg-hairline" />

        {/* Avatar and chevron only, no name. At 48px the name is the first
            thing that would push the bar wider, and it is already the button's
            accessible name and the first line of the menu it opens. */}
        <Button
          variant="ghost"
          aria-label={`Account menu for ${displayName || userEmail}`}
          className="gap-1.5 pr-1.5 pl-1.5"
        >
          <Avatar size="sm" name={displayName || userEmail} />
          <IconChevronDown className="size-4 text-ink-muted" stroke={1.75} />
        </Button>
      </div>
    </header>
  );
}
