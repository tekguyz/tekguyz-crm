## plancrm-drawer.webp (Plan CRM — Lead Detail slide-over)
TAKE: the slide-over pattern (dimmed backdrop, panel from the right), the
quick-action icon row (message/email/call/more) beside the name — replaces
our oversized header — the 4-up label/value metadata strip (map to our own
lead fields, not loan fields), the activity timeline with colored status
chips, Notes at the bottom.
IGNORE: the loan-progress bar, the specific field names, the photo (we have
none — see avatar note in Prompt 2).

## plancrm-nav-header.webp (Plan CRM — Contacts/Deals + nested nav)
TAKE: nested/expandable sidebar groups (chevron rotates open), the top bar
(search, a couple of icon buttons, avatar + chevron), the tabbed right-rail
as an alternative to one long scroll.
IGNORE: loan-specific tabs/content (Position, Docs Owed) — don't invent a
data model we don't have.

## bondcrm-pipeline.png (Bond CRM — Deals Pipeline)
TAKE ONLY the density: owner initials, "Xd in stage" aging, value + %
progress, column header with count + total $, a "+ Add deal" ghost row.
DO NOT TAKE the color: per-column background/header color, colored card
accents, colored tags (Enterprise/Renewal/Warm/etc.) — this uses color as a
layout signal, which fights how --accent and the pill palette are scoped.
Any stage distinction we want comes from our existing pill palette, not a
new one.

## mobile-newtask-sheet.png (mobile — New Task bottom sheet)
TAKE: bottom-sheet form pattern — grouped sections, removable chip tags,
avatar-chip multi-select, full-width CTA.
IGNORE: the desktop company grid and revenue widgets in the other mobile
crops — dashboard-adjacent, out of scope.

## tekguyz-current-*.png (our live app — baseline)
What exists today. Contacts' card grid with real Call/Text/Email/Map
buttons already works — polish, don't rebuild. Settings is flat label/value
stacks with no grouping. The lead edit modal is one long scrolling form.
The lead detail slide-over already exists — the header eats too much space
and content requires continuous scrolling with no way to jump sections.