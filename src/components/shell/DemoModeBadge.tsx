import { Badge } from "@/components/ui/Badge";

// Tells a visitor arriving through the public /demo link that this session
// cannot save anything, BEFORE they find out by clicking something.
//
// Why it exists at all: the demo identity holds the demo_readonly Postgres
// role, so every write is refused by the database and surfaces as the app's
// generic error boundary. On the first screen alone there are fifteen controls
// that write — six task Dismiss buttons, New Lead, and eight card toggles — and
// New Lead is the most inviting button on the page. Without this, a stranger's
// second or third click reads as "this build is broken", which is the exact
// opposite of what a case-study link is for.
//
// Why the org name is not enough: the sidebar already says "TEKGUYZ Demo", but
// that is the tenant's name. It tells you the DATA is a sample; it says nothing
// about whether you can save. Those are two different messages and only one of
// them is the one that matters when a write is refused.
//
// Why the header and not the sidebar: WorkspaceBlock is `sr-only` when the
// sidebar is collapsed and the sidebar is not rendered at all on mobile — and
// a case-study link gets a lot of phone traffic. This signal has to hold at
// every width, which is precisely what the sidebar cannot do.
//
// Header.tsx's own comment reserves that bar for two things and resists a
// third. That objection is about duplicating WORKSPACE IDENTITY, which is a
// per-tenant label the sidebar already owns. This is a session-mode indicator:
// it is not shown to any real tenant at all, so for every non-demo user the
// header still holds exactly two things.
export function DemoModeBadge() {
  return (
    <Badge
      tone="orange"
      dot
      // Read out as one phrase; the visual text is abbreviated on narrow
      // screens and a screen reader should not get the abbreviation.
      aria-label="Demo workspace. This session is read-only — nothing can be saved."
    >
      <span aria-hidden="true">
        Demo
        {/* Dropped below `sm` so the header still fits a phone: the word
            "Demo" plus the amber dot carries the signal on its own there, and
            the full phrase is in the aria-label at every width. */}
        <span className="hidden sm:inline"> · read-only</span>
      </span>
    </Badge>
  );
}
