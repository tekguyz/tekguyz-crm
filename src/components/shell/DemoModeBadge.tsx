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
// them is the one that matters when a write is refused — which is why this
// badge carries that message and nothing else.
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
// WHY IT SAYS "READ-ONLY" AND NOT "DEMO".
// The sidebar's WorkspaceBlock already says "TEKGUYZ Demo", and the visitor
// arrived through a link that called it a demo. The word adds nothing. What
// nobody can see from anywhere else is that this session cannot save, so that
// is the entire text. Dropping "Demo" also makes it short enough to fit a
// 375px header intact, which means there is no abbreviation to weaken the
// message on exactly the devices most likely to open a case-study link.
//
// WHY NEUTRAL AND NOT ORANGE. It shipped orange first, which put it in the
// same pill colour as the "Overdue" badges directly beneath it on the Today
// view — one colour carrying two unrelated meanings on a single screen, and
// the other one is a real SLA alert. This project's rule is that colour is
// signal, not decoration; read-only is a standing condition, not an alert, so
// it takes the neutral pill and stays legible without competing.
export function DemoModeBadge() {
  return (
    // The hairline is not decoration. Badge's neutral pill is canvas-soft,
    // which measures 1.06:1 against the header's canvas-pure — so the pill
    // shape is invisible there and the badge reads as loose text floating
    // beside the search control. This design system's stated answer is that
    // structure comes from hairline borders and spacing, never shadow, so it
    // gets a border rather than a louder fill.
    <Badge
      tone="neutral"
      dot
      className="border border-hairline"
      title="This is a public demo. Nothing you do here is saved."
    >
      Read-only
    </Badge>
  );
}
