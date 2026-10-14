# Final pass — design

Issue #47, step 10 (the last step). Brainstormed 2026-10-14. Status: spec,
awaiting review.

## Goal

Fix what the step-10 `/impeccable audit` found, plus five small leftovers, so
#47 can close. Then refresh `DESIGN.md` with `/impeccable document`.

Audit before: **15/20** (a11y 3, performance 3, responsive 2, theming 4,
integrity 3). Checked at 1440px and 375px, light and dark, on Today, Pipeline
(board and table), Contacts, Prospects, Reports, Settings, Import and the shell.

## Decisions made in brainstorming

| Question | Decision |
|---|---|
| Scope | **Option B:** the audit findings plus five small leftovers (#66 items 1, 2, 4; #68 items 9, 10). Feature work stays in its issues. |
| Pipeline lanes at 1024–1250px | **Narrower lanes.** Lane minimum width 256px → 192px. All four fit from about 1100px. Below that the board still scrolls. |
| Where the 44px fix lives | **Once, in the shared primitives**, under `max-sm` (below 640px). Desktop is unchanged. |

## Parts

### 1. 44px touch targets on a phone

The rule: every control is at least 44×44px below `sm`. It goes in the
primitive, so call sites need nothing.

- **`Button`** (`src/components/ui/Button.tsx`): `sm` and `md` sizes get
  `max-sm:min-h-11`. `lg` is already 44px.
- **`Input`, `Select`, `Textarea`**: the field gets `max-sm:min-h-11`.
- **`Checkbox`**: the 16px box keeps its look. An invisible hit area around it
  (`relative` plus an `after:` inset) makes the tap target 44px below `sm`.
- **`HelpTooltip`** (`src/components/help/HelpTooltip.tsx`): the 16px "What's
  this?" glyph keeps its look. The same invisible hit area makes it at least
  24px on desktop (WCAG 2.5.8) and 44px below `sm`.
- **Header controls**: `HelpTrigger`, `CommandTrigger` and the `IdentityMenu`
  trigger are 44px square (or 44px tall) below `sm`.
- **Icon-only buttons** that square a Button off by hand (`w-8 px-0` and the
  like) also get `max-sm:min-w-11`, where they show on a phone.
- Existing call-site `max-sm:min-h-11` / `max-sm:size-11` classes become
  redundant. Remove them only where the primitive now gives the same result;
  leave any that also set width.

This covers `FilterTabs`, Today's Dismiss and "Show all", the Settings forms,
Import's "Choose a file", the lead drawers and the demo banner, because they
all use these primitives.

Closes: #54 item 1, #56 item 1, #59 item 2, #61 item 1, #68 item 11.

### 2. Two accessibility bugs (axe)

- **Column resize handle** (`ColumnResizeHandle`,
  `src/components/ui/table-columns.tsx`). `role="separator"` with
  `tabIndex={0}` needs `aria-valuenow`, but it is `undefined` until the column
  is dragged. It must always carry the current width: the dragged width, else
  the column's measured width. Affects every table (Contacts, Pipeline table,
  Prospects).
- **Phone Pipeline card** (`FocusListCard`, `src/components/pipeline/`). The
  card is `role="button"` with a stage `<select>` inside it (axe
  `nested-interactive`), and Space or Enter on the select bubbles to the
  card's `onKeyDown` and opens the drawer. Fix: the card is no longer a
  button. A real `<button>` whose `::after` stretches over the card opens the
  drawer (the `DataTable` row pattern). The select sits above it
  (`relative z-10`), so it gets its own clicks and keys.

### 3. Pipeline lane width

`KanbanColumn`: `min-w-64` → `min-w-48`. Check at 1024, 1100, 1280 and 1440
that cards still read (name truncates, amount and due label stay whole).

Closes: #54 item 2.

### 4. Small fixes

- **Reports on a phone**: at 375px the four 44px period tabs fill the row,
  so Export CSV cannot share it. Today it wraps and floats right, alone. Below
  `sm` it sits left-aligned under the tabs (`max-sm:ml-0`), on the page's
  left edge like everything else (`src/app/(app)/reports/page.tsx`).
- **`check:widths` openers** (#66 item 1): `OPEN_EDIT_DRAWER` and
  `OPEN_READ_PANEL` in `scripts/check-comp-text-widths.mjs` click a Contacts
  table row's open button instead of the old card selector.
- **Ctrl K keycap** (#66 item 2): the `(app)` server layout reads the request's
  platform (`sec-ch-ua-platform`, falling back to `user-agent`) and passes
  "Apple or not" down to `CommandTrigger`. Apple shows `⌘K`, everything else
  `Ctrl K`. Decided on the server, so there is no hydration flash.
- **Prospects wording** (#66 item 4): `src/app/(app)/prospects/page.tsx`
  says "Cold outreach from the leadgen scrape." Proposed: "Your cold outreach
  list. Ring one, learn an email address, then promote it into a real lead."
  Same facts, no jargon. The import page's "leadgen pipeline" line gets the
  same treatment.
- **Empty lane** (#68 item 10): an empty lane shows only "+ New"; the
  "No leads" line goes. Both `KanbanColumn` and the phone `FocusList` group
  (each already renders `LaneAddButton` under the list).
- **Filtered empty states** (#68 item 9): when a filter hides every record
  ("No contacts are assigned to you.", and the same on Pipeline), the empty
  message carries a "Show all" link to the default view (`viewHref`).

### 5. Wrap-up

- Run `/impeccable document` to refresh `DESIGN.md` (touch targets, the lane
  width, the keycap rule).
- Comment on #54, #56, #59, #61, #66 and #68 with what this PR fixed (they
  are `refs`, not closed, unless every item in one is done).
- One new issue for anything still open from this pass.
- The PR body says `closes #47`.

## Testing

- Unit tests first (Vitest), one per primitive change: Button, Input, Select,
  Textarea and Checkbox carry the phone classes; `ColumnResizeHandle` always
  renders `aria-valuenow`; `FocusListCard` opens on its button and not on a
  key press inside the select; `CommandTrigger` shows `Ctrl K` or `⌘K` from
  its prop; the empty lane has no "No leads"; the filtered empty state has
  the "Show all" link.
- Browser: re-run the audit probe (axe + 44px + overflow) on every page at
  1440px and 375px, light and dark. Pipeline also at 1024 and 1100.
- Gates: `typecheck`, `lint`, `test:unit`, `build`, `check:docs`,
  `check:widths`.

## Out of scope (stays in its issue)

Prospects on `DataTable`, saved column widths, Saved Views and Group-by, a
Next action column on Contacts, phone Pipeline card redesign and "Move to"
menu, lane money totals (#68); stage drill-down links and the win-rate tooltip
(#59); role-change undo, section jump and webhook text (#61); Import
duplicates flag, skipped-rows download, live region and renames (#63);
palette "New lead" and long Settings captions (#66); task Undo slot (#54);
Prospects per-save feedback (#56).
