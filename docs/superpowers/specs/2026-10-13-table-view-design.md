# Table View primitive and view bar — design

Issue #47, step 9. Brainstormed 2026-10-13. Status: spec, awaiting review.

## Goal

Contacts and Pipeline get a Twenty-style view bar (view name, Filter, Sort)
above the list, and a real reusable table with icon column headers. Pipeline
gets a Board / Table switch. `DESIGN.md` § Scope is updated when it ships.

## Decisions made in brainstorming

| Question | Decision |
|---|---|
| How much Filter and Sort | **Small.** Filter holds the filters that exist (Status, Owner) plus Stage. Sort picks one field and a direction. No rule builder. |
| Where the record count lives | **Stays in the page header** (step 8). The view bar shows the view name only. One number on screen. |
| Pipeline Board / Table switch | **Yes**, in this step. Desktop only. |
| How to build the table | **A config-driven `DataTable`**, not hand-written tables per page. |

## Parts

### 1. `DataTable` — `src/components/ui/DataTable.tsx`

A client component built on the bare shell in `src/components/ui/TableRow.tsx`
and the opt-in resize / reorder in `src/components/ui/table-columns.tsx`.

- Props: `rows`, `columns`, `getRowId`, `onRowOpen(row)`, `sort` (current key
  and direction, or none), `sortHref(key)` (the URL for a header click),
  `emptyMessage`.
- A column: `id`, `label`, `icon` (Tabler component), `cell(row)`, optional
  `sortKey`, optional `minWidth`, optional `resizable`.
- Header cell: icon (`size-4`, `stroke 1.75`, `text-ink-muted`) + label. A
  sortable header is a `<Link scroll={false}>` to `sortHref(key)`. The active
  sort shows an up or down arrow, and its `<th>` carries `aria-sort`.
  Clicking the active header flips the direction.
- Resize and drag-to-move come from `useColumnLayout`. Session-only, same as
  Prospects today. Not persisted.
- Row: one bordered panel (`rounded-lg border border-hairline
  bg-canvas-pure`), hairline dividers, hover `bg-canvas-soft`, about 48px.
- Row open: the Name cell holds the row's one `<button>`, whose `::after`
  stretches over the row (the `ContactRow` pattern). Links in other cells
  (call, text, email) sit above it with `relative z-10` and are never nested
  inside the button.
- Empty: the dashed empty panel used by `ContactsList` today.
- The panel is `relative overflow-hidden` (the Prospects fix: sr-only spans
  must not escape to `<main>`).
- No selection, no inline edit, no grouping. Built when a feature needs them.

### 2. Lead columns — `src/components/leads/lead-columns.tsx`

One set of column definitions for leads, shared by both consumers.

| Column | Icon | Cell | Sort key |
|---|---|---|---|
| Name | `IconUser` | `Avatar` + name + company | `name` |
| Stage | `IconProgress` | `StageBadge` | `stage` |
| Amount | `IconCurrencyDollar` | estimated revenue, org currency format | `amount` |
| Next action | `IconCalendarDue` | `DueLabel` (never a bare date) | `due` |
| Channels | `IconAddressBook` | channel icon links (`channelLinks`) | none |
| Owner | `IconUserCircle` | `AssigneeLabel` with avatar | none |

Icon names are picks, not fixed; swap for a closer Tabler glyph if one reads
better in the browser.

- Contacts table: Name, Stage, Channels, Owner (the same four as today).
- Pipeline table: Name, Stage, Amount, Next action, Owner.
- Owner is not sortable: `assigned_to` is a uuid and the name is resolved in
  the client.
- A row opens `EditLeadDrawer`, as a Contacts row and a Kanban card do today.

### 3. `ViewBar` — `src/components/views/ViewBar.tsx`

One strip above the list, under the page header.

- **Left:** the view name, built from the active filters ("Active leads",
  "Archived · My leads", "Open leads · Quoted, Active"). Truncates with an
  ellipsis. On Pipeline, a Board / Table segmented control sits beside it
  (`lg` and up only).
- **Right:** **Filter** menu, **Sort** menu, then Export CSV on Contacts only
  (moved from the filter row; still a plain `<a download>`, still exports the
  whole directory regardless of filters).
- **Filter** (`dropdown-menu` primitive, radio and checkbox items that are
  links):
  - Status: Active / Archived — Contacts only.
  - Owner: All leads / My leads.
  - Stage: New, Discovery, Quoted, Active (multi-select). None ticked means
    all.
  - The button reads "Filter" and shows a count of non-default filters. A
    Reset item clears them all.
- **Sort** menu: Name, Stage, Amount, Next action, and Ascending /
  Descending. Pipeline adds **Priority** (today's `comparePipelinePriority`)
  as its default. Contacts' default is Name, ascending.
- Below `lg`: Filter and Sort are 44px icon buttons with their words as the
  accessible names.
- `FilterTabs` is no longer used on these two pages. It is not deleted if
  another page still uses it.

## Data flow

### URL is the only view state

| Param | Values | Default (omitted) |
|---|---|---|
| `archived` | `true` | active (Contacts only) |
| `mine` | `true` | all owners |
| `stage` | comma list of `NEW,DISCOVERY,QUOTED,ACTIVE` | all stages |
| `sort` | `name`, `stage`, `amount`, `due`, `priority` (Pipeline) | `name` on Contacts, `priority` on Pipeline |
| `dir` | `asc`, `desc` | `asc` (`priority` has no direction) |
| `view` | `table` | board (Pipeline only) |

- One pure module, `src/lib/views/params.ts`, parses `searchParams` into a
  typed view and builds hrefs that change one thing and keep the rest. A
  default is omitted from the URL, as `contactsHref` does today.
- An unknown or bad value falls back to the default. Parsing never throws.
- The stage list is normalised (known values only, deduped, sorted in
  pipeline order) so two URLs that mean the same view build the same query.

### Filters run in the query, sort runs on the page

- `getAllContacts` and `getPipelineLeads` take a stage filter beside the
  owner filter and add `.in("status", stages)` when it is not "all".
- **`cache()` keys by argument identity.** Pass the stages as the normalised
  comma string (a primitive), never an array, or the `@header` slot and the
  page make two queries and the count can drift from the list.
- The `@header` slots for Contacts and Pipeline parse the same params with the
  same module and call the same query with the same arguments. The header
  count stays the list's own.
- Sorting is a pure function, `src/lib/leads/sort.ts`, applied on the server
  page to the fetched array. It does not change the count.
- No new column, no migration, no database writes, no test data.

### Pipeline

- `?view=table` at `lg` and up renders `DataTable` with the Pipeline columns
  instead of `KanbanBoard`.
- Board: Sort changes card order inside each lane. `groupLeadsByStatus` takes
  the chosen comparator; Priority stays the default.
- Stage filter on the board: lanes not picked are hidden.
- Drag between lanes still works. The `key` remount on the board and Focus
  List must now include every view param that changes the fetched leads
  (owner and stage), or the old result set shows after a filter change.

## Phone (below `lg`, 1024px)

- Contacts keeps today's two-line `ContactRow` list with 44px call / text /
  email targets. `DataTable` renders at `lg` and up only.
- Pipeline keeps the Focus List. The Board / Table switch is hidden.
- The view bar fits 375px with no sideways scroll: view name truncates,
  Filter and Sort are icon buttons.

## Testing

TDD. Unit tests first, with Vitest, run with `npx vitest run <file>`.

- `src/lib/views/params.test.ts`: parse defaults, bad values fall back, stage
  normalising, hrefs keep the other params and omit defaults.
- `src/lib/leads/sort.test.ts`: each key both ways, nulls last, Priority
  matches `comparePipelinePriority`.
- `DataTable.test.tsx`: icon in each header, `aria-sort` on the sorted header
  only, header link hrefs, row open fires, links in a row do not open it,
  empty message.
- `ViewBar.test.tsx`: view name text, filter count, Reset href, Export CSV on
  Contacts only, Board / Table switch on Pipeline only.
- Existing `ContactsList.test.tsx` and `KanbanBoard.test.tsx` stay green.

Browser pane, signed in through `GET /api/dev-login`, after `npm run
seed:demo`: Contacts and Pipeline (board and table) at 1440px and 375px,
light and dark. Filter, Sort, header sort, resize, drag-to-move, row open,
reload keeps the view, header count matches the list.

Gates: `npm run typecheck`, `npm run lint`, `npm run test:unit`,
`npm run check:docs`, `npm run check:widths`.

## Docs

- `DESIGN.md` § Scope: Table View moves from "does not cover" to "covers".
  Saved Views and Group-by stay out.
- `DESIGN.md`: a short section on `DataTable` and `ViewBar`, and the step-8
  note "step 9's view bar owns it next" updated to say it does.
- Comment in `TableRow.tsx` updated: `DataTable` is the composed table; the
  shell stays bare.

## Out of scope (new issue at the end)

- Prospects onto `DataTable` and `ViewBar`.
- Saving column widths and order.
- Saved Views, Group-by, a rule-builder filter.
- #66 item 1 (`check:widths` openers for the Contacts drawer) is its own fix.

## Delivery

Branch `design/47-step-9-table-view`, one PR, `refs #47` (step 10 is still
open). Run `/impeccable critique` on Contacts and Pipeline before the UI
work, per the issue.
