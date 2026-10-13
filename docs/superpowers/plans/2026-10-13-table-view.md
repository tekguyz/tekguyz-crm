# Table View primitive and view bar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contacts and Pipeline get a Twenty-style view bar (view name, Filter, Sort) and a reusable, config-driven `DataTable` with icon column headers; Pipeline gets a Board / Table switch.

**Architecture:** The URL is the only view state. One pure module (`src/lib/views/params.ts`) parses `searchParams` into a typed `LeadView` and builds every href. Filters run in the Supabase query (stage joins owner and archived); sort is a pure function on the server page. `DataTable` is a generic client component on the existing `Table` shell and `useColumnLayout`; a thin client `LeadsTable` binds it to leads, because a server page cannot pass functions (column cells, `sortHref`, `onRowOpen`) to a client component.

**Tech Stack:** Next.js App Router (server pages + `@header` parallel-route slots), React 19, Supabase JS, Radix dropdown-menu, Tabler icons, Tailwind v4 tokens, Vitest + Testing Library (jsdom for `*.test.tsx`, node for `*.test.ts`).

**Spec:** `docs/superpowers/specs/2026-10-13-table-view-design.md` (approved 2026-10-13). Read it with this plan.

## Global Constraints

- Branch `design/47-step-9-table-view`. One PR. PR body says `refs #47`, never `closes` (step 10 is still open).
- Run `/impeccable critique` on Contacts and Pipeline before any UI work (Task 1).
- No new column, no migration, no database writes, no test data.
- `cache()` keys by argument identity: the stage filter is passed as the normalised comma **string**, never an array. The `@header` slot and the page call each query with the same arguments in the same order.
- Primitives from `src/components/ui/` only. No one-off styled `<button>`. Links styled as buttons use `Button asChild`.
- Icons: `@tabler/icons-react` only. Header icons `size-4`, `stroke={1.75}`, `text-ink-muted`.
- `--accent` only for CTAs, active nav, focus and links. Overdue is `DueLabel` red text, never grey.
- Phone is below `lg` (1024px). At 375px: no sideways scroll; Filter and Sort are 44px icon buttons with their words as accessible names.
- Column width and order are session-only (`useColumnLayout`). Not persisted.
- Export CSV stays a plain `<a href="/api/leads/export" download>` and still exports the whole directory regardless of filters.
- Tests: `npx vitest run <file>` while working; `npm run test:unit` once before each commit. **Never `npm test`.**
- Any script that needs `.env` (`seed:demo`, `check:residue`) runs through the **PowerShell** tool, not Bash.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A hand-edited or reordered `?stage=` (e.g. `ACTIVE,NEW,NEW`)** must give the header count and the list the same number. Pinned by the normalising and round-trip tests in Task 2.
2. **Changing the owner or stage filter on the board** must show the new leads, not the old ones kept in `useState`. Pinned by the `boardKey` test in Task 2; the page uses `boardKey` in Task 10.
3. **Descending sort** must not move leads with no amount or no date to the top. Pinned by the nulls-last tests in Task 3.
4. **Enter on a channel link inside a table row** must not open the lead. Pinned by the DataTable test in Task 6.
5. **Sorting on the page** must not reorder the `cache()`d array that the `@header` slot shares. Pinned by the "does not mutate" test in Task 3.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/lib/views/params.ts` | Create | Parse `searchParams` → `LeadView`; build hrefs; view name; filter count; board key |
| `src/lib/views/params.test.ts` | Create | Node tests for the above |
| `src/lib/leads/sort.ts` | Create | `leadComparator`, `sortLeads` (nulls last, Priority = `comparePipelinePriority`) |
| `src/lib/leads/sort.test.ts` | Create | Node tests |
| `src/lib/leads/pipeline.ts` | Modify | `groupLeadsByStatus` takes an optional comparator |
| `src/lib/leads/queries.ts` | Modify | `getAllContacts` / `getPipelineLeads` take a `stages` string |
| `src/lib/leads/queries.test.ts` | Create | Stage filter reaches the query as `.in("status", …)` |
| `src/app/(app)/@header/contacts/page.tsx`, `src/app/(app)/@header/pipeline/page.tsx` | Modify | Parse with `parseView`, same query args as the page |
| `src/components/ui/dropdown-menu.tsx` (+ test) | Modify | Add `DropdownMenuCheckboxItem` |
| `src/components/ui/DataTable.tsx` (+ test) | Create | Generic table: icon headers, sort links, resize/reorder, row open, empty state |
| `src/components/ui/TableRow.tsx` | Modify | Comment only |
| `src/components/leads/ChannelLinks.tsx` | Create | The channel link buttons, moved out of `ContactRow` (no behaviour change) |
| `src/components/contacts/ContactRow.tsx` | Modify | Use `ChannelLinks` |
| `src/components/leads/lead-columns.tsx` | Create | The six lead column definitions and the per-page column sets |
| `src/components/leads/LeadsTable.tsx` (+ test) | Create | Client glue: `DataTable` + lead columns + one `EditLeadDrawer` |
| `src/components/views/ViewBar.tsx` (+ test) | Create | View name, Board/Table switch, Filter, Sort, Export CSV |
| `src/components/leads/FilterTabs.tsx` | Modify | Comment only (its callers changed) |
| `src/app/(app)/contacts/page.tsx` | Modify | ViewBar, LeadsTable at `lg`, ContactsList below, sort |
| `src/components/pipeline/KanbanBoard.tsx`, `FocusList.tsx` (+ KanbanBoard test) | Modify | `lanes`, `sort`, `dir` props |
| `src/app/(app)/pipeline/page.tsx` | Modify | ViewBar, board or table, `boardKey` remount |
| `scripts/check-comp-text-widths.mjs` | Modify | Measure `/contacts` and `/pipeline?view=table` |
| `DESIGN.md`, `docs/KNOWN_GAPS.md` | Modify | Scope, new section, test count |

---

### Task 1: Critique Contacts and Pipeline first

No code. This is the rule from issue #47: critique before UI work.

**Files:** none changed. Notes go in the session and, at the end, in the PR body and the leftovers issue.

- [ ] **Step 1: Re-seed the local demo** so dates are not all overdue (issue #47 note). PowerShell tool:

```powershell
npm run seed:demo
```

Expected: exits 0.

- [ ] **Step 2: Start the dev server and sign in.** `preview_start` with `{name: "dev"}`, then navigate the tab to `/api/dev-login`. Expected: lands signed in.

- [ ] **Step 3: Run the critique.** Invoke the `impeccable` skill with args `critique /contacts and /pipeline`. Check 1440px and 375px, light and dark.

- [ ] **Step 4: Sort the findings.** Write a short list in the session:
  - Findings this spec's parts fix (view bar, table, header icons, filter row) → fix them inside Tasks 8–10.
  - Findings outside this spec → they go into the leftovers issue in Task 12.
  - Record the score ("Critique before: N/40") for the PR body.

---

### Task 2: View params module

**Files:**
- Create: `src/lib/views/params.ts`
- Test: `src/lib/views/params.test.ts`

**Interfaces:**
- Consumes: `PIPELINE_STATUSES`, `PIPELINE_STATUS_LABELS`, `PipelineStatus` from `src/lib/leads/pipeline.ts`.
- Produces (every later task uses these exact names):
  - `type ViewPage = "contacts" | "pipeline"`
  - `type LeadSortKey = "name" | "stage" | "amount" | "due" | "priority"`
  - `type SortDir = "asc" | "desc"`
  - `type ViewLayout = "board" | "table"`
  - `type LeadView = { archived: boolean; mine: boolean; stages: PipelineStatus[]; sort: LeadSortKey; dir: SortDir; layout: ViewLayout }`
  - `type RawSearchParams = Record<string, string | string[] | undefined>`
  - `SORT_LABELS: Record<LeadSortKey, string>`
  - `sortKeysFor(page): LeadSortKey[]`
  - `defaultView(page): LeadView`
  - `parseView(page, raw: RawSearchParams): LeadView`
  - `stagesKey(stages: readonly PipelineStatus[]): string`
  - `viewHref(page, view, change?: Partial<LeadView>): string`
  - `headerSortHref(page, view, key: LeadSortKey): string`
  - `toggleStageHref(page, view, stage: PipelineStatus): string`
  - `filterCount(page, view): number`
  - `resetFiltersHref(page, view): string`
  - `viewName(page, view): string`
  - `boardKey(view): string`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/views/params.test.ts
import { describe, expect, it } from "vitest";

import {
  boardKey,
  defaultView,
  filterCount,
  headerSortHref,
  parseView,
  resetFiltersHref,
  stagesKey,
  toggleStageHref,
  viewHref,
  viewName,
  type LeadView,
  type ViewPage,
} from "@/lib/views/params";

// Parses the query string of an href the same way Next hands searchParams to
// a page, so a round trip proves the builder and the parser agree.
function reparse(page: ViewPage, href: string): LeadView {
  return parseView(page, Object.fromEntries(new URL(href, "http://x").searchParams));
}

describe("parseView", () => {
  it("gives each page its defaults when the URL is bare", () => {
    expect(parseView("contacts", {})).toEqual({
      archived: false,
      mine: false,
      stages: [],
      sort: "name",
      dir: "asc",
      layout: "board",
    });
    expect(parseView("pipeline", {}).sort).toBe("priority");
  });

  it("reads every param", () => {
    expect(
      parseView("contacts", {
        archived: "true",
        mine: "true",
        stage: "QUOTED",
        sort: "amount",
        dir: "desc",
      }),
    ).toEqual({
      archived: true,
      mine: true,
      stages: ["QUOTED"],
      sort: "amount",
      dir: "desc",
      layout: "board",
    });
    expect(parseView("pipeline", { view: "table" }).layout).toBe("table");
  });

  it("ignores a param that does not belong to the page", () => {
    expect(parseView("pipeline", { archived: "true" }).archived).toBe(false);
    expect(parseView("contacts", { view: "table" }).layout).toBe("board");
    expect(parseView("contacts", { sort: "priority" }).sort).toBe("name");
  });

  it("falls back to the default for a bad value and never throws", () => {
    const view = parseView("pipeline", {
      mine: "yes",
      stage: "WON,foo,",
      sort: "bogus",
      dir: "sideways",
      view: "grid",
    });
    expect(view).toEqual(defaultView("pipeline"));
  });

  it("takes the first value when a param repeats", () => {
    expect(parseView("contacts", { mine: ["true", "false"] }).mine).toBe(true);
  });

  it("normalises the stage list: known values, deduped, pipeline order", () => {
    const view = parseView("pipeline", { stage: "ACTIVE,NEW,NEW,nope" });
    expect(view.stages).toEqual(["NEW", "ACTIVE"]);
    expect(stagesKey(view.stages)).toBe("NEW,ACTIVE");
  });

  it("gives two URLs that mean the same view the same stage key", () => {
    const a = parseView("pipeline", { stage: "QUOTED,NEW" });
    const b = parseView("pipeline", { stage: "NEW,QUOTED,QUOTED" });
    expect(stagesKey(a.stages)).toBe(stagesKey(b.stages));
  });

  it("gives Priority no direction", () => {
    expect(parseView("pipeline", { dir: "desc" }).dir).toBe("asc");
  });
});

describe("viewHref", () => {
  it("omits every default", () => {
    expect(viewHref("contacts", defaultView("contacts"))).toBe("/contacts");
    expect(viewHref("pipeline", defaultView("pipeline"))).toBe("/pipeline");
  });

  it("changes one thing and keeps the rest", () => {
    const view = parseView("contacts", { archived: "true", sort: "amount" });
    expect(viewHref("contacts", view, { mine: true })).toBe(
      "/contacts?archived=true&mine=true&sort=amount",
    );
  });

  it("writes the stage list in pipeline order with plain commas", () => {
    const view = defaultView("pipeline");
    expect(viewHref("pipeline", view, { stages: ["ACTIVE", "QUOTED"] })).toBe(
      "/pipeline?stage=QUOTED,ACTIVE",
    );
  });

  it("writes dir only when it is desc and the sort has a direction", () => {
    expect(viewHref("contacts", defaultView("contacts"), { dir: "desc" })).toBe("/contacts?dir=desc");
    expect(viewHref("pipeline", defaultView("pipeline"), { dir: "desc" })).toBe("/pipeline");
  });

  it("writes the table layout on Pipeline only", () => {
    expect(viewHref("pipeline", defaultView("pipeline"), { layout: "table" })).toBe(
      "/pipeline?view=table",
    );
    expect(viewHref("contacts", defaultView("contacts"), { layout: "table" })).toBe("/contacts");
  });

  it("round-trips through parseView", () => {
    const view: LeadView = {
      archived: false,
      mine: true,
      stages: ["DISCOVERY", "ACTIVE"],
      sort: "due",
      dir: "desc",
      layout: "table",
    };
    expect(reparse("pipeline", viewHref("pipeline", view))).toEqual(view);
  });
});

describe("headerSortHref", () => {
  it("flips the direction of the active sort", () => {
    const view = parseView("contacts", {});
    expect(headerSortHref("contacts", view, "name")).toBe("/contacts?dir=desc");
    const desc = parseView("contacts", { dir: "desc" });
    expect(headerSortHref("contacts", desc, "name")).toBe("/contacts");
  });

  it("starts a new sort ascending", () => {
    const view = parseView("contacts", { sort: "amount", dir: "desc" });
    expect(headerSortHref("contacts", view, "stage")).toBe("/contacts?sort=stage");
    expect(headerSortHref("pipeline", defaultView("pipeline"), "amount")).toBe(
      "/pipeline?sort=amount",
    );
  });
});

describe("filters", () => {
  it("adds and removes one stage", () => {
    const view = parseView("pipeline", { stage: "NEW" });
    expect(toggleStageHref("pipeline", view, "QUOTED")).toBe("/pipeline?stage=NEW,QUOTED");
    expect(toggleStageHref("pipeline", view, "NEW")).toBe("/pipeline");
  });

  it("counts the filters that are not default", () => {
    expect(filterCount("contacts", defaultView("contacts"))).toBe(0);
    const view = parseView("contacts", { archived: "true", mine: "true", stage: "NEW,QUOTED" });
    expect(filterCount("contacts", view)).toBe(3);
  });

  it("resets the filters and keeps the sort and the layout", () => {
    const view = parseView("pipeline", { mine: "true", stage: "NEW", sort: "amount", view: "table" });
    expect(resetFiltersHref("pipeline", view)).toBe("/pipeline?sort=amount&view=table");
  });
});

describe("viewName", () => {
  it("names the view from its filters", () => {
    expect(viewName("contacts", defaultView("contacts"))).toBe("Active leads");
    expect(viewName("contacts", parseView("contacts", { archived: "true" }))).toBe("Archived leads");
    expect(viewName("contacts", parseView("contacts", { archived: "true", mine: "true" }))).toBe(
      "Archived · My leads",
    );
    expect(viewName("pipeline", parseView("pipeline", { stage: "ACTIVE,QUOTED" }))).toBe(
      "Open leads · Quoted, Active",
    );
    expect(viewName("pipeline", parseView("pipeline", { mine: "true" }))).toBe("Open · My leads");
  });
});

describe("boardKey", () => {
  it("changes when the fetched leads change, and not for a sort", () => {
    const base = defaultView("pipeline");
    const key = boardKey(base);
    expect(boardKey({ ...base, mine: true })).not.toBe(key);
    expect(boardKey({ ...base, stages: ["NEW"] })).not.toBe(key);
    expect(boardKey({ ...base, sort: "amount", dir: "desc" })).toBe(key);
    expect(boardKey({ ...base, layout: "table" })).toBe(key);
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `npx vitest run src/lib/views/params.test.ts`
Expected: FAIL, "Failed to resolve import "@/lib/views/params"".

- [ ] **Step 3: Write the module**

```ts
// src/lib/views/params.ts
import {
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  type PipelineStatus,
} from "@/lib/leads/pipeline";

// THE ONE PLACE a lead list's view state is read from and written to the URL
// (#47 step 9). The URL is the only view state: Contacts and Pipeline, their
// @header slots and the view bar all parse with parseView and build with
// viewHref, so the header count, the list and the menus can never disagree
// about which view is on screen.
//
// Pure, no directive: server pages, @header slots and client components all
// import it.

export type ViewPage = "contacts" | "pipeline";
export type LeadSortKey = "name" | "stage" | "amount" | "due" | "priority";
export type SortDir = "asc" | "desc";
export type ViewLayout = "board" | "table";

export type LeadView = {
  // Contacts only. Pipeline is always the live, open leads.
  archived: boolean;
  mine: boolean;
  // Normalised: known values only, deduped, in pipeline order. Empty = all.
  stages: PipelineStatus[];
  sort: LeadSortKey;
  // Ignored (always "asc") when sort is "priority", which has no direction.
  dir: SortDir;
  // Pipeline only, and only at lg and up.
  layout: ViewLayout;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const PATHS: Record<ViewPage, string> = { contacts: "/contacts", pipeline: "/pipeline" };

export const SORT_LABELS: Record<LeadSortKey, string> = {
  priority: "Priority",
  name: "Name",
  stage: "Stage",
  amount: "Amount",
  due: "Next action",
};

export function sortKeysFor(page: ViewPage): LeadSortKey[] {
  return page === "pipeline"
    ? ["priority", "name", "stage", "amount", "due"]
    : ["name", "stage", "amount", "due"];
}

export function defaultView(page: ViewPage): LeadView {
  return {
    archived: false,
    mine: false,
    stages: [],
    sort: page === "pipeline" ? "priority" : "name",
    dir: "asc",
    layout: "board",
  };
}

// Next hands a repeated param over as an array. The first one wins.
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normaliseStages(values: readonly string[]): PipelineStatus[] {
  const wanted = new Set(values);
  return PIPELINE_STATUSES.filter((status) => wanted.has(status));
}

// The stage filter as cache()'s key. A string, never an array: cache() keys
// by argument identity, so an array would give the @header slot and the page
// two separate queries, and the count could drift from the list.
export function stagesKey(stages: readonly PipelineStatus[]): string {
  return normaliseStages(stages).join(",");
}

// Never throws. An unknown or bad value falls back to the default.
export function parseView(page: ViewPage, raw: RawSearchParams): LeadView {
  const view = defaultView(page);

  if (page === "contacts" && first(raw.archived) === "true") view.archived = true;
  if (first(raw.mine) === "true") view.mine = true;

  const stage = first(raw.stage);
  if (stage) view.stages = normaliseStages(stage.split(","));

  const sort = first(raw.sort);
  if (sort && (sortKeysFor(page) as string[]).includes(sort)) view.sort = sort as LeadSortKey;
  if (view.sort !== "priority" && first(raw.dir) === "desc") view.dir = "desc";

  if (page === "pipeline" && first(raw.view) === "table") view.layout = "table";

  return view;
}

// Changes what `change` names and keeps the rest. A default is omitted, so
// the default view's URL is the bare path. Built by hand rather than with
// URLSearchParams so the stage list keeps plain commas: every value here is a
// fixed ASCII token, so there is nothing to encode.
export function viewHref(page: ViewPage, view: LeadView, change: Partial<LeadView> = {}): string {
  const next = { ...view, ...change };
  const base = defaultView(page);
  const parts: string[] = [];

  if (page === "contacts" && next.archived) parts.push("archived=true");
  if (next.mine) parts.push("mine=true");
  const stages = stagesKey(next.stages);
  if (stages) parts.push(`stage=${stages}`);
  if (next.sort !== base.sort) parts.push(`sort=${next.sort}`);
  if (next.sort !== "priority" && next.dir === "desc") parts.push("dir=desc");
  if (page === "pipeline" && next.layout === "table") parts.push("view=table");

  return parts.length ? `${PATHS[page]}?${parts.join("&")}` : PATHS[page];
}

// A table header click: the active sort flips, any other sort starts asc.
export function headerSortHref(page: ViewPage, view: LeadView, key: LeadSortKey): string {
  const dir: SortDir = view.sort === key && view.dir === "asc" ? "desc" : "asc";
  return viewHref(page, view, { sort: key, dir });
}

export function toggleStageHref(page: ViewPage, view: LeadView, stage: PipelineStatus): string {
  const stages = view.stages.includes(stage)
    ? view.stages.filter((s) => s !== stage)
    : [...view.stages, stage];
  return viewHref(page, view, { stages });
}

// One per filter group that is not at its default: Status, Owner, Stage.
export function filterCount(page: ViewPage, view: LeadView): number {
  return (
    (page === "contacts" && view.archived ? 1 : 0) +
    (view.mine ? 1 : 0) +
    (view.stages.length > 0 ? 1 : 0)
  );
}

export function resetFiltersHref(page: ViewPage, view: LeadView): string {
  return viewHref(page, view, { archived: false, mine: false, stages: [] });
}

// "Active leads", "Archived · My leads", "Open leads · Quoted, Active".
export function viewName(page: ViewPage, view: LeadView): string {
  const scope = page === "pipeline" ? "Open" : view.archived ? "Archived" : "Active";
  const owner = view.mine ? `${scope} · My leads` : `${scope} leads`;
  if (view.stages.length === 0) return owner;
  return `${owner} · ${view.stages.map((stage) => PIPELINE_STATUS_LABELS[stage]).join(", ")}`;
}

// The board and the Focus List seed useState from their leads, so they must
// remount whenever the FETCHED set changes (owner, stage). Sort and layout do
// not change the fetched set and must not remount them.
export function boardKey(view: LeadView): string {
  return `${view.mine ? "mine" : "all"}|${stagesKey(view.stages) || "all"}`;
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run src/lib/views/params.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/views/params.ts src/lib/views/params.test.ts
git commit -m "feat(views): URL view state for Contacts and Pipeline (refs #47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Lead sort

**Files:**
- Create: `src/lib/leads/sort.ts`
- Modify: `src/lib/leads/pipeline.ts:34-48` (`groupLeadsByStatus`)
- Test: `src/lib/leads/sort.test.ts`

**Interfaces:**
- Consumes: `LeadSortKey`, `SortDir` (Task 2); `comparePipelinePriority`, `PIPELINE_STATUSES` (`pipeline.ts`); `Lead` (`queries.ts`).
- Produces:
  - `leadComparator(sort: LeadSortKey, dir: SortDir): (a: Lead, b: Lead) => number`
  - `sortLeads(leads: readonly Lead[], sort: LeadSortKey, dir: SortDir): Lead[]` (returns a new array)
  - `groupLeadsByStatus(leads: Lead[], compare?: (a: Lead, b: Lead) => number)` — default stays `comparePipelinePriority`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/leads/sort.test.ts
import { describe, expect, it } from "vitest";

import { comparePipelinePriority, groupLeadsByStatus } from "@/lib/leads/pipeline";
import type { Lead } from "@/lib/leads/queries";
import { leadComparator, sortLeads } from "@/lib/leads/sort";

function lead(overrides: Partial<Lead> & { client_name: string }): Lead {
  return {
    id: overrides.client_name,
    company: null,
    email: null,
    phone: null,
    website: null,
    physical_address: null,
    social_google_business: null,
    social_facebook: null,
    social_instagram: null,
    social_whatsapp: null,
    lead_source: null,
    service_category: null,
    estimated_revenue: 0,
    status: "NEW",
    outcome: null,
    actual_revenue: null,
    next_action_at: "2099-01-01T00:00:00.000Z",
    is_starred: false,
    ai_brief: null,
    archived: false,
    assigned_to: null,
    ...overrides,
  };
}

const names = (leads: Lead[]) => leads.map((l) => l.client_name);

describe("sortLeads", () => {
  it("sorts by name both ways, ignoring case", () => {
    const leads = [lead({ client_name: "bob" }), lead({ client_name: "Ada" }), lead({ client_name: "Carl" })];
    expect(names(sortLeads(leads, "name", "asc"))).toEqual(["Ada", "bob", "Carl"]);
    expect(names(sortLeads(leads, "name", "desc"))).toEqual(["Carl", "bob", "Ada"]);
  });

  it("sorts by stage in pipeline order, not A-Z", () => {
    const leads = [
      lead({ client_name: "a", status: "ACTIVE" }),
      lead({ client_name: "n", status: "NEW" }),
      lead({ client_name: "q", status: "QUOTED" }),
      lead({ client_name: "d", status: "DISCOVERY" }),
    ];
    expect(names(sortLeads(leads, "stage", "asc"))).toEqual(["n", "d", "q", "a"]);
    expect(names(sortLeads(leads, "stage", "desc"))).toEqual(["a", "q", "d", "n"]);
  });

  it("sorts by amount and keeps a missing amount last both ways", () => {
    const leads = [
      lead({ client_name: "none", estimated_revenue: null as unknown as number }),
      lead({ client_name: "low", estimated_revenue: 100 }),
      lead({ client_name: "high", estimated_revenue: 900 }),
    ];
    expect(names(sortLeads(leads, "amount", "asc"))).toEqual(["low", "high", "none"]);
    expect(names(sortLeads(leads, "amount", "desc"))).toEqual(["high", "low", "none"]);
  });

  it("sorts by next action and keeps a missing date last both ways", () => {
    const leads = [
      lead({ client_name: "none", next_action_at: null as unknown as string }),
      lead({ client_name: "late", next_action_at: "2099-06-01T00:00:00.000Z" }),
      lead({ client_name: "soon", next_action_at: "2099-01-01T00:00:00.000Z" }),
    ];
    expect(names(sortLeads(leads, "due", "asc"))).toEqual(["soon", "late", "none"]);
    expect(names(sortLeads(leads, "due", "desc"))).toEqual(["late", "soon", "none"]);
  });

  it("breaks a tie by name, A-Z, in either direction", () => {
    const leads = [lead({ client_name: "Zed", estimated_revenue: 100 }), lead({ client_name: "Abe", estimated_revenue: 100 })];
    expect(names(sortLeads(leads, "amount", "asc"))).toEqual(["Abe", "Zed"]);
    expect(names(sortLeads(leads, "amount", "desc"))).toEqual(["Abe", "Zed"]);
  });

  it("matches comparePipelinePriority for Priority, whatever the direction", () => {
    const leads = [
      lead({ client_name: "big", estimated_revenue: 5000 }),
      lead({ client_name: "starred", is_starred: true }),
      lead({ client_name: "late", next_action_at: "2000-01-01T00:00:00.000Z" }),
    ];
    const expected = names([...leads].sort(comparePipelinePriority));
    expect(names(sortLeads(leads, "priority", "asc"))).toEqual(expected);
    expect(names(sortLeads(leads, "priority", "desc"))).toEqual(expected);
  });

  it("does not mutate the array it is given", () => {
    const leads = [lead({ client_name: "b" }), lead({ client_name: "a" })];
    sortLeads(leads, "name", "asc");
    expect(names(leads)).toEqual(["b", "a"]);
  });
});

describe("groupLeadsByStatus with a comparator", () => {
  it("orders each lane by the comparator it is given", () => {
    const leads = [
      lead({ client_name: "Zed", estimated_revenue: 5000 }),
      lead({ client_name: "Abe", estimated_revenue: 100 }),
    ];
    expect(names(groupLeadsByStatus(leads).NEW)).toEqual(["Zed", "Abe"]);
    expect(names(groupLeadsByStatus(leads, leadComparator("name", "asc")).NEW)).toEqual(["Abe", "Zed"]);
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `npx vitest run src/lib/leads/sort.test.ts`
Expected: FAIL, "Failed to resolve import "@/lib/leads/sort"".

- [ ] **Step 3: Write `sort.ts`**

```ts
// src/lib/leads/sort.ts
import { PIPELINE_STATUSES, comparePipelinePriority } from "@/lib/leads/pipeline";
import type { Lead } from "@/lib/leads/queries";
import type { LeadSortKey, SortDir } from "@/lib/views/params";

// Sorting for the Contacts and Pipeline views (#47 step 9), as pure functions
// over an already-fetched array, run on the server page. The same reasoning as
// lib/prospects/sort.ts: the whole set is fetched to render the list anyway.
//
// A missing value sorts LAST in both directions. A lead with no amount is not
// the cheapest lead, and flipping the direction must never move the leads you
// cannot compare to the top.

type SortValue = string | number | null;

function valueOf(lead: Lead, key: Exclude<LeadSortKey, "priority">): SortValue {
  switch (key) {
    case "name":
      return lead.client_name ?? null;
    case "stage": {
      const index = PIPELINE_STATUSES.indexOf(lead.status as (typeof PIPELINE_STATUSES)[number]);
      return index === -1 ? null : index;
    }
    case "amount":
      return lead.estimated_revenue ?? null;
    case "due": {
      const time = lead.next_action_at ? Date.parse(lead.next_action_at) : NaN;
      return Number.isNaN(time) ? null : time;
    }
  }
}

function compareValues(left: string | number, right: string | number): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), undefined, { sensitivity: "base", numeric: true });
}

// Ties fall back to the name, A-Z in either direction, then the id, so the
// order is the same on every render.
function tieBreak(a: Lead, b: Lead): number {
  return compareValues(a.client_name ?? "", b.client_name ?? "") || a.id.localeCompare(b.id);
}

export function leadComparator(sort: LeadSortKey, dir: SortDir): (a: Lead, b: Lead) => number {
  if (sort === "priority") return comparePipelinePriority;
  // A const keeps the narrowing inside the closure below.
  const key: Exclude<LeadSortKey, "priority"> = sort;
  const sign = dir === "desc" ? -1 : 1;

  return (a, b) => {
    const left = valueOf(a, key);
    const right = valueOf(b, key);
    if (left === null || right === null) {
      if (left === right) return tieBreak(a, b);
      return left === null ? 1 : -1;
    }
    return compareValues(left, right) * sign || tieBreak(a, b);
  };
}

// A new array. The input may be the cache()'d query result that the @header
// slot also reads, so it is never sorted in place.
export function sortLeads(leads: readonly Lead[], sort: LeadSortKey, dir: SortDir): Lead[] {
  return [...leads].sort(leadComparator(sort, dir));
}
```

- [ ] **Step 4: Give `groupLeadsByStatus` a comparator**

In `src/lib/leads/pipeline.ts`, replace the function (lines 34–48) with:

```ts
// `compare` orders the cards inside each lane. Priority is the default; the
// view bar's Sort passes another (lib/leads/sort.ts).
export function groupLeadsByStatus(
  leads: Lead[],
  compare: (a: Lead, b: Lead) => number = comparePipelinePriority,
): Record<PipelineStatus, Lead[]> {
  const groups = Object.fromEntries(
    PIPELINE_STATUSES.map((status) => [status, [] as Lead[]]),
  ) as Record<PipelineStatus, Lead[]>;

  for (const lead of leads) {
    const bucket = groups[lead.status as PipelineStatus];
    (bucket ?? groups.NEW).push(lead);
  }

  for (const status of PIPELINE_STATUSES) {
    groups[status].sort(compare);
  }

  return groups;
}
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `npx vitest run src/lib/leads/sort.test.ts "src/app/(dev)/shell/pipeline/PipelineVariants.test.tsx"`
Expected: PASS. (The comp test still calls `groupLeadsByStatus` with one argument.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/leads/sort.ts src/lib/leads/sort.test.ts src/lib/leads/pipeline.ts
git commit -m "feat(leads): sort leads by name, stage, amount, next action or priority (refs #47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Stage filter in the queries, header slots and pages

**Files:**
- Modify: `src/lib/leads/queries.ts:91-106` (`getPipelineLeads`), `:145-163` (`getAllContacts`)
- Modify: `src/app/(app)/@header/contacts/page.tsx`, `src/app/(app)/@header/pipeline/page.tsx`
- Modify: `src/app/(app)/contacts/page.tsx:23-36`, `src/app/(app)/pipeline/page.tsx:11-25` (query call only; UI stays until Tasks 9–10)
- Test: `src/lib/leads/queries.test.ts`

**Interfaces:**
- Consumes: `parseView`, `stagesKey`, `RawSearchParams` (Task 2).
- Produces:
  - `getPipelineLeads(orgId: string, assignedTo?: string, stages = ""): Promise<Lead[]>`
  - `getAllContacts(orgId: string, archived = false, assignedTo?: string, stages = ""): Promise<ContactLead[]>`
  - `stages` is a `stagesKey(...)` string; `""` means all stages.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/leads/queries.test.ts
import { describe, expect, it, vi } from "vitest";

// Records every filter. The builder is thenable because getPipelineLeads
// awaits the query itself rather than ending on .order().
function mockSupabase() {
  const calls: Array<[string, string, unknown]> = [];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      calls.push(["eq", column, value]);
      return builder;
    }),
    is: vi.fn((column: string, value: unknown) => {
      calls.push(["is", column, value]);
      return builder;
    }),
    in: vi.fn((column: string, value: unknown) => {
      calls.push(["in", column, value]);
      return builder;
    }),
    order: vi.fn(() => builder),
    then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
      resolve({ data: [], error: null }),
  };
  return { calls, client: { from: vi.fn(() => builder) } };
}

async function loadQueries(mock: ReturnType<typeof mockSupabase>) {
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: () => Promise.resolve(mock.client),
  }));
  vi.resetModules();
  return import("@/lib/leads/queries");
}

describe("stage filter", () => {
  it("adds no stage filter when every stage is wanted", async () => {
    const mock = mockSupabase();
    const { getPipelineLeads, getAllContacts } = await loadQueries(mock);

    await getPipelineLeads("org-1", undefined, "");
    await getAllContacts("org-1", false, undefined, "");

    expect(mock.calls.filter(([op]) => op === "in")).toEqual([]);
  });

  it("filters the pipeline by stage in the query", async () => {
    const mock = mockSupabase();
    const { getPipelineLeads } = await loadQueries(mock);

    await getPipelineLeads("org-1", "user-1", "NEW,QUOTED");

    expect(mock.calls).toContainEqual(["in", "status", ["NEW", "QUOTED"]]);
    expect(mock.calls).toContainEqual(["eq", "assigned_to", "user-1"]);
  });

  it("filters contacts by stage on top of archived", async () => {
    const mock = mockSupabase();
    const { getAllContacts } = await loadQueries(mock);

    await getAllContacts("org-1", true, undefined, "ACTIVE");

    expect(mock.calls).toContainEqual(["in", "status", ["ACTIVE"]]);
    expect(mock.calls).toContainEqual(["eq", "archived", true]);
  });
});
```

- [ ] **Step 2: Run the test and see it fail**

Run: `npx vitest run src/lib/leads/queries.test.ts`
Expected: FAIL on the two filter tests (no `in` call recorded).

- [ ] **Step 3: Add the `stages` parameter to both queries**

In `getPipelineLeads`, change the signature and add the filter after the owner line:

```ts
export const getPipelineLeads = cache(async function getPipelineLeads(
  orgId: string,
  assignedTo?: string,
  // A stagesKey() string ("NEW,QUOTED"), never an array — cache() keys by
  // argument identity. "" means every stage.
  stages = "",
): Promise<Lead[]> {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("organization_id", orgId)
    .eq("archived", false)
    .is("outcome", null);

  if (assignedTo) query = query.eq("assigned_to", assignedTo);
  if (stages) query = query.in("status", stages.split(","));

  const { data, error } = await query;

  if (error) throw error;
  return data;
});
```

In `getAllContacts`, the same:

```ts
export const getAllContacts = cache(async function getAllContacts(
  orgId: string,
  archived = false,
  assignedTo?: string,
  // A stagesKey() string, never an array — see getPipelineLeads.
  stages = "",
): Promise<ContactLead[]> {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select(CONTACT_COLUMNS)
    .eq("organization_id", orgId)
    .eq("archived", archived);

  if (assignedTo) query = query.eq("assigned_to", assignedTo);
  if (stages) query = query.in("status", stages.split(","));

  const { data, error } = await query.order("client_name", { ascending: true });

  if (error) throw error;
  return data;
});
```

- [ ] **Step 4: Run the test and see it pass**

Run: `npx vitest run src/lib/leads/queries.test.ts`
Expected: PASS.

- [ ] **Step 5: Header slots parse with `parseView`**

`src/app/(app)/@header/contacts/page.tsx` — replace the `SearchParams` type and `ContactsCount`:

```tsx
import { parseView, stagesKey, type RawSearchParams } from "@/lib/views/params";

type SearchParams = Promise<RawSearchParams>;

// The same call the page makes, argument for argument, so cache() serves both
// from one query and the count is the list's own: what the database returned
// for these filters, so an empty or short list is never ambiguous.
async function ContactsCount({ searchParams }: { searchParams: SearchParams }) {
  const view = parseView("contacts", await searchParams);
  const { orgId, userId } = await getCurrentOrg();
  const contacts = await getAllContacts(
    orgId,
    view.archived,
    view.mine ? userId : undefined,
    stagesKey(view.stages),
  );
  return <HeaderCount n={contacts.length} noun={contacts.length === 1 ? "contact" : "contacts"} />;
}
```

`src/app/(app)/@header/pipeline/page.tsx`:

```tsx
import { parseView, stagesKey, type RawSearchParams } from "@/lib/views/params";

type SearchParams = Promise<RawSearchParams>;

// The same call the page makes, argument for argument, so cache() serves both
// from one query and the count is the board's own.
async function PipelineCount({ searchParams }: { searchParams: SearchParams }) {
  const view = parseView("pipeline", await searchParams);
  const { orgId, userId } = await getCurrentOrg();
  const leads = await getPipelineLeads(orgId, view.mine ? userId : undefined, stagesKey(view.stages));
  return <HeaderCount n={leads.length} noun={leads.length === 1 ? "open lead" : "open leads"} />;
}
```

- [ ] **Step 6: Pages call the queries with the same arguments**

`src/app/(app)/contacts/page.tsx` — keep the FilterTabs UI for now. Change the props type and the top of the component:

```tsx
import { parseView, stagesKey, type RawSearchParams } from "@/lib/views/params";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const view = parseView("contacts", await searchParams);
  const showArchived = view.archived;
  const showMine = view.mine;

  const { orgId, userId } = await getCurrentOrg();
  // Filtering happens in the query, not in the list — assigned_to is indexed
  // (idx_leads_tenant_assignee) and this keeps the "empty" state honest: the
  // count the user sees is the count the database returned.
  const contacts = await getAllContacts(
    orgId,
    view.archived,
    view.mine ? userId : undefined,
    stagesKey(view.stages),
  );
```

`src/app/(app)/pipeline/page.tsx` — same idea:

```tsx
import { parseView, stagesKey, type RawSearchParams } from "@/lib/views/params";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const view = parseView("pipeline", await searchParams);
  const showMine = view.mine;

  const { orgId, orgTimezone, currencyFormat, userId } = await getCurrentOrg();
  // (keep the existing comment block here)
  const leads = await getPipelineLeads(orgId, view.mine ? userId : undefined, stagesKey(view.stages));
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/lib/leads/queries.ts src/lib/leads/queries.test.ts "src/app/(app)/@header/contacts/page.tsx" "src/app/(app)/@header/pipeline/page.tsx" "src/app/(app)/contacts/page.tsx" "src/app/(app)/pipeline/page.tsx"
git commit -m "feat(leads): stage filter in the Contacts and Pipeline queries (refs #47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `DropdownMenuCheckboxItem`

The Stage filter is multi-select. The primitive has no checkbox row yet, and now it has a live consumer.

**Files:**
- Modify: `src/components/ui/dropdown-menu.tsx`
- Test: `src/components/ui/dropdown-menu.test.tsx`

**Interfaces:**
- Produces: `DropdownMenuCheckboxItem` — props of Radix `DropdownMenu.CheckboxItem` (`checked`, `onCheckedChange`, `onSelect`, `disabled`, `className`, `children`). Trailing check mark, like `DropdownMenuRadioItem`.

- [ ] **Step 1: Read the live registry part** (design-system rule, step 2):

Run: `npx shadcn@latest view dropdown-menu`
Look at `DropdownMenuCheckboxItem`. Keep its Radix part and `data-slot`. Do not copy `outline-none` or its colour classes. If the command cannot reach the registry, say so and use the structure below.

- [ ] **Step 2: Write the failing tests** — add to `src/components/ui/dropdown-menu.test.tsx`. Add `DropdownMenuCheckboxItem` to the import list, then add inside the `describe` block:

```tsx
  it("does not suppress the focus outline on DropdownMenuCheckboxItem", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>Quoted</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expectNoOutlineSuppression(screen.getByRole("menuitemcheckbox", { name: "Quoted" }));
  });

  it("marks a checked DropdownMenuCheckboxItem as checked", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>Quoted</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={false}>Active</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByRole("menuitemcheckbox", { name: "Quoted" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemcheckbox", { name: "Active" })).toHaveAttribute("aria-checked", "false");
  });
```

Also add `<DropdownMenuCheckboxItem checked>Quoted</DropdownMenuCheckboxItem>` inside the content of the existing "suppresses the outline on no interactive row in an open menu" test, so the sweep covers it.

- [ ] **Step 3: Run the tests and see them fail**

Run: `npx vitest run src/components/ui/dropdown-menu.test.tsx`
Expected: FAIL, `DropdownMenuCheckboxItem` is not exported.

- [ ] **Step 4: Add the part**

In `src/components/ui/dropdown-menu.tsx`, after `DropdownMenuRadioItem`:

```tsx
// Same row as the radio item, for a multi-select group (the view bar's Stage
// filter). Trailing indicator for the same reason as the radio item.
function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(ITEM_CLASS, "pr-8", className)}
      {...props}
    >
      {children}
      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center text-accent">
        <DropdownMenuPrimitive.ItemIndicator>
          <IconCheck className="size-4" stroke={2} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
    </DropdownMenuPrimitive.CheckboxItem>
  );
}
```

Add `DropdownMenuCheckboxItem,` to the export list. In the header comment, change "shadcn's dropdown-menu also exports Group, Portal, CheckboxItem, Shortcut, Sub, SubTrigger and SubContent" to "shadcn's dropdown-menu also exports Group, Portal, Shortcut, Sub, SubTrigger and SubContent" and add one line: "CheckboxItem arrived with its first caller, the view bar's Stage filter (#47 step 9)." In the test file's sweep comment, change "If DropdownMenuCheckboxItem / SubTrigger are added later (neither exists today …)" to say CheckboxItem now exists and is swept.

- [ ] **Step 5: Run the tests and see them pass**

Run: `npx vitest run src/components/ui/dropdown-menu.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/dropdown-menu.tsx src/components/ui/dropdown-menu.test.tsx
git commit -m "feat(ui): DropdownMenuCheckboxItem for multi-select filters (refs #47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `DataTable`

**Files:**
- Create: `src/components/ui/DataTable.tsx`
- Modify: `src/components/ui/TableRow.tsx:5-11` (comment only)
- Test: `src/components/ui/DataTable.test.tsx`

**Interfaces:**
- Consumes: `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell` (`TableRow.tsx`); `useColumnLayout`, `ColumnSpec`, `columnTableProps`, `columnHeaderProps`, `TableColumnGroup`, `ColumnReorderHandle`, `ColumnResizeHandle` (`table-columns.tsx`); `Button`.
- Produces:
  - `type DataTableColumn<T, K extends string = string> = ColumnSpec<K> & { label: string; icon: Icon; cell: (row: T) => ReactNode; sortKey?: string; align?: "start" | "end"; opensRow?: boolean }`
  - `type DataTableSort = { key: string; dir: "asc" | "desc" }`
  - `DataTable<T, K extends string>(props: { label: string; rows: readonly T[]; columns: readonly DataTableColumn<T, K>[]; getRowId: (row: T) => string; onRowOpen: (row: T) => void; sort: DataTableSort | null; sortHref: (key: string) => string; emptyMessage: string })`
  - `columns` must be referentially stable (`useMemo`) — `useColumnLayout` reads it in `useCallback` deps.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/ui/DataTable.test.tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconPhone, IconUser } from "@tabler/icons-react";
import { describe, expect, it, vi } from "vitest";

import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";

type Row = { id: string; name: string; phone: string };

const ROWS: Row[] = [
  { id: "r1", name: "Ada Park", phone: "+13055550100" },
  { id: "r2", name: "Ben Ortiz", phone: "+13055550101" },
];

const COLUMNS: DataTableColumn<Row, "name" | "phone">[] = [
  { id: "name", label: "Name", icon: IconUser, sortKey: "name", opensRow: true, cell: (row) => row.name },
  {
    id: "phone",
    label: "Phone",
    icon: IconPhone,
    cell: (row) => (
      <a href={`tel:${row.phone}`} className="relative z-10">
        Call {row.name}
      </a>
    ),
  },
];

function renderTable(overrides: Partial<Parameters<typeof DataTable<Row, "name" | "phone">>[0]> = {}) {
  const onRowOpen = vi.fn();
  render(
    <DataTable
      label="People"
      rows={ROWS}
      columns={COLUMNS}
      getRowId={(row) => row.id}
      onRowOpen={onRowOpen}
      sort={{ key: "name", dir: "asc" }}
      sortHref={(key) => `/people?sort=${key}`}
      emptyMessage="Nobody here."
      {...overrides}
    />,
  );
  return { onRowOpen };
}

describe("DataTable", () => {
  it("puts the column's icon in each header", () => {
    renderTable();
    const [name, phone] = screen.getAllByRole("columnheader");
    expect(name.querySelector(".tabler-icon-user")).not.toBeNull();
    expect(phone.querySelector(".tabler-icon-phone")).not.toBeNull();
  });

  it("sets aria-sort on the sorted header only", () => {
    renderTable({ sort: { key: "name", dir: "desc" } });
    const [name, phone] = screen.getAllByRole("columnheader");
    expect(name).toHaveAttribute("aria-sort", "descending");
    expect(phone).not.toHaveAttribute("aria-sort");
  });

  it("sets no aria-sort when the sort is not a column", () => {
    renderTable({ sort: null });
    for (const header of screen.getAllByRole("columnheader")) {
      expect(header).not.toHaveAttribute("aria-sort");
    }
  });

  it("makes a sortable header a link to its sort, and leaves the others plain", () => {
    renderTable();
    const [name, phone] = screen.getAllByRole("columnheader");
    expect(within(name).getByRole("link", { name: "Name" })).toHaveAttribute("href", "/people?sort=name");
    expect(within(phone).queryByRole("link")).toBeNull();
  });

  it("opens a row from its name button", async () => {
    const user = userEvent.setup();
    const { onRowOpen } = renderTable();
    await user.click(screen.getByRole("button", { name: "Ada Park" }));
    expect(onRowOpen).toHaveBeenCalledWith(ROWS[0]);
  });

  it("does not open the row from a link in it, and never nests the link", async () => {
    const user = userEvent.setup();
    const { onRowOpen } = renderTable();
    const call = screen.getByRole("link", { name: "Call Ada Park" });
    expect(call.closest("button")).toBeNull();
    call.focus();
    await user.keyboard("{Enter}");
    expect(onRowOpen).not.toHaveBeenCalled();
  });

  it("shows the empty message and no table when there are no rows", () => {
    renderTable({ rows: [] });
    expect(screen.getByText("Nobody here.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `npx vitest run src/components/ui/DataTable.test.tsx`
Expected: FAIL, cannot resolve `@/components/ui/DataTable`.

- [ ] **Step 3: Write `DataTable`**

```tsx
// src/components/ui/DataTable.tsx
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowDown, IconArrowUp, type Icon } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/TableRow";
import {
  ColumnReorderHandle,
  ColumnResizeHandle,
  TableColumnGroup,
  columnHeaderProps,
  columnTableProps,
  useColumnLayout,
  type ColumnSpec,
} from "@/components/ui/table-columns";
import { cn } from "@/lib/utils/cn";

// The composed table (#47 step 9): the bare shell in TableRow.tsx plus the
// opt-in resize and reorder in table-columns.tsx, driven by a column config.
// First callers: Contacts and Pipeline, through components/leads/LeadsTable.
//
// Sort state is the URL's, not this component's. A sortable header is a
// <Link> to the href the caller builds, so a reload or a shared link keeps the
// view. Width and order are session-only, as on Prospects.
//
// One <button> per row, in the column marked `opensRow`. Its ::after
// stretches over the row (the <tr> is `relative`), so a click anywhere opens
// the row; links in other cells sit above it with `relative z-10` and are
// never inside the button (the ContactRow pattern — nesting them made Enter on
// a link open the row too).
//
// No selection, no inline edit, no grouping. Built when a feature needs them.

export type DataTableColumn<T, K extends string = string> = ColumnSpec<K> & {
  label: string;
  icon: Icon;
  cell: (row: T) => ReactNode;
  sortKey?: string;
  align?: "start" | "end";
  opensRow?: boolean;
};

export type DataTableSort = { key: string; dir: "asc" | "desc" };

export function DataTable<T, K extends string>({
  label,
  rows,
  columns,
  getRowId,
  onRowOpen,
  sort,
  sortHref,
  emptyMessage,
}: {
  label: string;
  rows: readonly T[];
  // Must be referentially stable (useMemo at the call site).
  columns: readonly DataTableColumn<T, K>[];
  getRowId: (row: T) => string;
  onRowOpen: (row: T) => void;
  sort: DataTableSort | null;
  sortHref: (key: string) => string;
  emptyMessage: string;
}) {
  const layout = useColumnLayout(columns);

  if (rows.length === 0) {
    return (
      <div className="text-body-md rounded-lg border border-dashed border-hairline px-3 py-8 text-center text-ink-muted">
        {emptyMessage}
      </div>
    );
  }

  const byId = new Map(columns.map((column) => [column.id, column]));
  const tableProps = columnTableProps(layout);

  return (
    // `relative overflow-hidden` is load-bearing (the Prospects fix): the
    // table's sr-only spans are position:absolute and must not escape to the
    // shell's <main> and make it scroll sideways.
    <div className="relative overflow-hidden rounded-lg border border-hairline bg-canvas-pure [&_tbody>tr:last-child]:border-b-0">
      <Table aria-label={label} {...tableProps}>
        <TableColumnGroup layout={layout} />
        <TableHead>
          <TableRow ref={layout.headerRowRef}>
            {layout.order.map((id) => {
              const column = byId.get(id)!;
              const header = columnHeaderProps(layout, id);
              const sorted = sort !== null && column.sortKey === sort.key ? sort.dir : null;
              const ColumnIcon = column.icon;
              const icon = (
                <ColumnIcon className="size-4 shrink-0 text-ink-muted" stroke={1.75} aria-hidden="true" />
              );
              return (
                <TableHeaderCell
                  key={id}
                  {...header}
                  aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined}
                  className={cn(header.className, "whitespace-nowrap")}
                >
                  <div
                    className={cn("flex items-center gap-0.5", column.align === "end" && "justify-end")}
                  >
                    <ColumnReorderHandle layout={layout} id={id} label={column.label} />
                    {column.sortKey ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={sortHref(column.sortKey)} scroll={false}>
                          {icon}
                          {column.label}
                          {sorted === "asc" ? (
                            <IconArrowUp className="size-3.5" stroke={1.75} aria-hidden="true" />
                          ) : sorted === "desc" ? (
                            <IconArrowDown className="size-3.5" stroke={1.75} aria-hidden="true" />
                          ) : null}
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-body-sm inline-flex h-7 items-center gap-1.5 px-2">
                        {icon}
                        {column.label}
                      </span>
                    )}
                  </div>
                  {column.resizable === false ? null : (
                    <ColumnResizeHandle layout={layout} id={id} label={column.label} />
                  )}
                </TableHeaderCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getRowId(row)} className="relative transition-colors hover:bg-canvas-soft">
              {layout.order.map((id) => {
                const column = byId.get(id)!;
                const content = column.cell(row);
                return (
                  <TableCell key={id} className={cn("h-12", column.align === "end" && "text-right")}>
                    {column.opensRow ? (
                      <button
                        type="button"
                        onClick={() => onRowOpen(row)}
                        className="flex w-full min-w-0 items-center rounded-sm text-left after:absolute after:inset-0 after:content-['']"
                      >
                        {content}
                      </button>
                    ) : (
                      content
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run src/components/ui/DataTable.test.tsx src/components/ui/TableRow.test.tsx`
Expected: PASS. If `getByRole("button", { name: "Ada Park" })` fails because the reorder handle is also a button, read the error: the handle's name is "Move Name column…", so it must not match; fix the test only if the name really differs.

- [ ] **Step 5: Update the `TableRow.tsx` comment** (lines 5–11) to:

```tsx
// Bare structural shell. No sorting, selection or data prop. Column resize and
// reorder are opt-in and live in the sibling `table-columns.tsx`.
// `DataTable.tsx` is the composed table (icon headers, URL sort, row open)
// built on both; a table that needs none of that renders this shell and
// nothing more (StageLedger, the importers, `/design`).
//
// The horizontal scroll wrapper is here rather than at call sites so a wide
// table can never make the page body scroll sideways.
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/DataTable.tsx src/components/ui/DataTable.test.tsx src/components/ui/TableRow.tsx
git commit -m "feat(ui): DataTable with icon headers, URL sort and row open (refs #47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Lead columns and `LeadsTable`

**Files:**
- Create: `src/components/leads/ChannelLinks.tsx`
- Modify: `src/components/contacts/ContactRow.tsx` (use `ChannelLinks`; no behaviour change)
- Create: `src/components/leads/lead-columns.tsx`
- Create: `src/components/leads/LeadsTable.tsx`
- Test: `src/components/leads/LeadsTable.test.tsx`

**Interfaces:**
- Consumes: `DataTable`, `DataTableColumn` (Task 6); `LeadView`, `ViewPage`, `LeadSortKey`, `headerSortHref` (Task 2); `EditLeadDrawer`, `AssigneeLabel`, `DueLabel`, `StageBadge`, `Avatar`, `formatCurrency`.
- Produces:
  - `ChannelLinks({ lead }: { lead: Lead })` — a fragment of link buttons.
  - `type LeadColumnId = "name" | "stage" | "amount" | "due" | "channels" | "owner"`
  - `LEAD_COLUMN_IDS: Record<ViewPage, LeadColumnId[]>`
  - `leadColumns(ctx: { orgTimezone: string; currencyFormat: string }): Record<LeadColumnId, DataTableColumn<Lead, LeadColumnId>>`
  - `LeadsTable({ page, leads, view, orgTimezone, currencyFormat, emptyMessage }: { page: ViewPage; leads: Lead[]; view: LeadView; orgTimezone: string; currencyFormat: string; emptyMessage: string })` — client component, safe to render from a server page.

- [ ] **Step 1: Move the channel links out of `ContactRow`**

Create `src/components/leads/ChannelLinks.tsx`:

```tsx
import { ChannelIcon } from "@/components/leads/ChannelIcon";
import { Button } from "@/components/ui/Button";
import { channelLinks, type ChannelLinkKind } from "@/lib/leads/channel-links";
import type { Lead } from "@/lib/leads/queries";
import { cn } from "@/lib/utils/cn";

// The channels a phone row keeps. The rest (website, socials, map) are one
// tap away in the lead's panel header; on a 375px row they would push the
// call/text/email targets below 44px or onto a third line.
const PHONE_CHANNELS = new Set<ChannelLinkKind>(["call", "text", "email", "whatsapp"]);

// One icon link per Contact Channel the lead has. Shared by the Contacts row
// (both widths) and the lead table's Channels column (lg and up), so the two
// can never disagree. Each link is `relative z-10` so it sits above a row's
// stretched open button, beside it and never inside it.
export function ChannelLinks({ lead }: { lead: Lead }) {
  return (
    <>
      {channelLinks(lead).map((link) => (
        <Button
          key={link.kind}
          asChild
          variant="ghost"
          size="sm"
          className={cn(
            "relative z-10 size-11 justify-center px-0 lg:size-8",
            !PHONE_CHANNELS.has(link.kind) && "hidden lg:inline-flex",
          )}
        >
          <a
            href={link.href}
            aria-label={`${link.label} ${lead.client_name}`}
            title={link.label}
            {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <ChannelIcon kind={link.kind} className="size-[1.125rem] lg:size-4" />
          </a>
        </Button>
      ))}
    </>
  );
}
```

In `src/components/contacts/ContactRow.tsx`: delete `PHONE_CHANNELS` and its comment, delete `const links = channelLinks(lead);`, replace the `{links.map(...)}` block inside the channels `<div>` with `<ChannelLinks lead={lead} />`, and fix the imports (remove `channelLinks`, `ChannelLinkKind`, `ChannelIcon`, `Button`; add `import { ChannelLinks } from "@/components/leads/ChannelLinks";`; keep `cn`).

- [ ] **Step 2: Check the move changed nothing**

Run: `npx vitest run src/components/contacts/ContactsList.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 3: Write the failing `LeadsTable` tests**

```tsx
// src/components/leads/LeadsTable.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Lead } from "@/lib/leads/queries";
import { MembersProvider } from "@/components/shell/MembersContext";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { parseView, type ViewPage } from "@/lib/views/params";

vi.mock("@/components/leads/EditLeadDrawer", () => ({
  EditLeadDrawer: ({ open, lead }: { open: boolean; lead: Lead }) =>
    open ? <div data-testid="drawer">{lead.client_name}</div> : null,
}));

const LEAD = {
  id: "lead-1",
  client_name: "Amanda Chu",
  company: "GreenScape",
  email: "amanda@example.com",
  phone: "+1 305 555 0100",
  website: null,
  physical_address: null,
  social_google_business: null,
  social_facebook: null,
  social_instagram: null,
  social_whatsapp: null,
  lead_source: null,
  service_category: null,
  estimated_revenue: 4200,
  status: "QUOTED",
  outcome: null,
  actual_revenue: null,
  next_action_at: "2099-01-01T15:00:00.000Z",
  is_starred: false,
  ai_brief: null,
  archived: false,
  assigned_to: null,
} as Lead;

function renderTable(page: ViewPage, query: Record<string, string> = {}) {
  return render(
    <MembersProvider members={[]}>
      <LeadsTable
        page={page}
        leads={[LEAD]}
        view={parseView(page, query)}
        orgTimezone="UTC"
        currencyFormat="USD"
        emptyMessage="No contacts yet."
      />
    </MembersProvider>,
  );
}

const headers = () => screen.getAllByRole("columnheader").map((th) => th.textContent);

describe("LeadsTable", () => {
  it("shows the Contacts columns", () => {
    renderTable("contacts");
    expect(headers()).toEqual(["Name", "Stage", "Channels", "Owner"]);
  });

  it("shows the Pipeline columns, with the amount and the due label", () => {
    renderTable("pipeline");
    expect(headers()).toEqual(["Name", "Stage", "Amount", "Next action", "Owner"]);
    expect(screen.getByText("$4,200")).toBeInTheDocument();
  });

  it("does not make Owner or Channels sortable", () => {
    renderTable("contacts");
    expect(screen.queryByRole("link", { name: "Owner" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Channels" })).toBeNull();
  });

  it("links a header to its sort in the URL", () => {
    renderTable("contacts");
    expect(screen.getByRole("link", { name: "Name" })).toHaveAttribute("href", "/contacts?dir=desc");
    expect(screen.getByRole("link", { name: "Stage" })).toHaveAttribute("href", "/contacts?sort=stage");
  });

  it("opens the lead in the edit drawer", async () => {
    const user = userEvent.setup();
    renderTable("contacts");
    expect(screen.queryByTestId("drawer")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Amanda Chu/ }));
    expect(screen.getByTestId("drawer")).toHaveTextContent("Amanda Chu");
  });
});
```

Note: a header's `textContent` is its label only, because the reorder handle's name is an `aria-label` (no text) and the icons are SVGs with no text. If a header's text differs, read it and fix the test only if the label is right.

- [ ] **Step 4: Run the tests and see them fail**

Run: `npx vitest run src/components/leads/LeadsTable.test.tsx`
Expected: FAIL, cannot resolve `@/components/leads/LeadsTable`.

- [ ] **Step 5: Write `lead-columns.tsx`**

```tsx
// src/components/leads/lead-columns.tsx
import {
  IconAddressBook,
  IconCalendarDue,
  IconCurrencyDollar,
  IconProgress,
  IconUser,
  IconUserCircle,
} from "@tabler/icons-react";

import { AssigneeLabel } from "@/components/leads/AssigneeLabel";
import { ChannelLinks } from "@/components/leads/ChannelLinks";
import { DueLabel } from "@/components/leads/DueLabel";
import { StageBadge } from "@/components/leads/StageBadge";
import { Avatar } from "@/components/ui/Avatar";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { formatCurrency } from "@/lib/format";
import type { Lead } from "@/lib/leads/queries";
import type { ViewPage } from "@/lib/views/params";

// THE ONE SET of lead column definitions, shared by the Contacts and Pipeline
// tables (#47 step 9). Each column renders the same part the rest of the app
// uses for that field: StageBadge, DueLabel (never a bare date), Avatar,
// AssigneeLabel, ChannelLinks.
//
// No directive: only client components import this (LeadsTable), and a
// server component cannot pass these cell functions across the boundary.

export type LeadColumnId = "name" | "stage" | "amount" | "due" | "channels" | "owner";

export const LEAD_COLUMN_IDS: Record<ViewPage, LeadColumnId[]> = {
  contacts: ["name", "stage", "channels", "owner"],
  pipeline: ["name", "stage", "amount", "due", "owner"],
};

// Owner is not sortable: assigned_to is a uuid and the name is resolved in
// the client (MembersContext), so the server cannot sort by it.
export function leadColumns({
  orgTimezone,
  currencyFormat,
}: {
  orgTimezone: string;
  currencyFormat: string;
}): Record<LeadColumnId, DataTableColumn<Lead, LeadColumnId>> {
  return {
    name: {
      id: "name",
      label: "Name",
      icon: IconUser,
      sortKey: "name",
      opensRow: true,
      minWidth: 200,
      cell: (lead) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={lead.client_name} size="sm" />
          <span className="min-w-0">
            <span className="text-body-md block truncate font-medium">{lead.client_name}</span>
            {lead.company ? (
              <span className="text-body-sm block truncate text-ink-muted">{lead.company}</span>
            ) : null}
          </span>
        </span>
      ),
    },
    stage: {
      id: "stage",
      label: "Stage",
      icon: IconProgress,
      sortKey: "stage",
      minWidth: 110,
      cell: (lead) => <StageBadge status={lead.status} />,
    },
    amount: {
      id: "amount",
      label: "Amount",
      icon: IconCurrencyDollar,
      sortKey: "amount",
      align: "end",
      minWidth: 110,
      cell: (lead) => (
        <span className="text-body-md font-medium tabular-nums">
          {formatCurrency(lead.estimated_revenue, currencyFormat)}
        </span>
      ),
    },
    due: {
      id: "due",
      label: "Next action",
      icon: IconCalendarDue,
      sortKey: "due",
      minWidth: 140,
      cell: (lead) => <DueLabel at={lead.next_action_at} timeZone={orgTimezone} />,
    },
    channels: {
      id: "channels",
      label: "Channels",
      icon: IconAddressBook,
      minWidth: 120,
      cell: (lead) => (
        <div className="flex items-center gap-1">
          <ChannelLinks lead={lead} />
        </div>
      ),
    },
    owner: {
      id: "owner",
      label: "Owner",
      icon: IconUserCircle,
      minWidth: 140,
      cell: (lead) => <AssigneeLabel assignedTo={lead.assigned_to} avatar />,
    },
  };
}
```

- [ ] **Step 6: Write `LeadsTable.tsx`**

```tsx
// src/components/leads/LeadsTable.tsx
"use client";

import { useMemo, useState } from "react";

import { EditLeadDrawer } from "@/components/leads/EditLeadDrawer";
import { LEAD_COLUMN_IDS, leadColumns } from "@/components/leads/lead-columns";
import { DataTable } from "@/components/ui/DataTable";
import type { Lead } from "@/lib/leads/queries";
import {
  headerSortHref,
  type LeadSortKey,
  type LeadView,
  type ViewPage,
} from "@/lib/views/params";

// The lead table for Contacts and Pipeline (lg and up). The glue between a
// server page and DataTable: a server page can pass the leads and the parsed
// view, but not the cell functions, the sort hrefs or the open handler.
//
// One EditLeadDrawer for the table, keyed by lead, so its form state resets
// between leads (.claude/rules/forms.md). The lead is looked up from the
// current `leads` prop by id, so a save that refreshes the page shows the
// fresh row, not a stale copy.
export function LeadsTable({
  page,
  leads,
  view,
  orgTimezone,
  currencyFormat,
  emptyMessage,
}: {
  page: ViewPage;
  leads: Lead[];
  view: LeadView;
  orgTimezone: string;
  currencyFormat: string;
  emptyMessage: string;
}) {
  const columns = useMemo(() => {
    const all = leadColumns({ orgTimezone, currencyFormat });
    return LEAD_COLUMN_IDS[page].map((id) => all[id]);
  }, [page, orgTimezone, currencyFormat]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const openLead = openId ? leads.find((lead) => lead.id === openId) : undefined;

  return (
    <>
      <DataTable
        label={page === "contacts" ? "Contacts" : "Open leads"}
        rows={leads}
        columns={columns}
        getRowId={(lead) => lead.id}
        onRowOpen={(lead) => {
          setOpenId(lead.id);
          setOpen(true);
        }}
        // Priority is not a column, so no header shows a sort arrow for it.
        sort={view.sort === "priority" ? null : { key: view.sort, dir: view.dir }}
        sortHref={(key) => headerSortHref(page, view, key as LeadSortKey)}
        emptyMessage={emptyMessage}
      />
      {openLead ? (
        <EditLeadDrawer
          key={openLead.id}
          lead={openLead}
          open={open}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
```

- [ ] **Step 7: Run the tests and see them pass**

Run: `npx vitest run src/components/leads/LeadsTable.test.tsx src/components/contacts/ContactsList.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/leads/ChannelLinks.tsx src/components/contacts/ContactRow.tsx src/components/leads/lead-columns.tsx src/components/leads/LeadsTable.tsx src/components/leads/LeadsTable.test.tsx
git commit -m "feat(leads): lead columns and LeadsTable on DataTable (refs #47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `ViewBar`

**Files:**
- Create: `src/components/views/ViewBar.tsx`
- Modify: `src/components/leads/FilterTabs.tsx:10-13` (comment only)
- Test: `src/components/views/ViewBar.test.tsx`

**Interfaces:**
- Consumes: everything in Task 2; `DropdownMenu*` incl. `DropdownMenuCheckboxItem` (Task 5); `FilterTabs`; `StageBadge`; `Badge`; `Button`.
- Produces: `ViewBar({ page, view }: { page: ViewPage; view: LeadView })` — client component, safe to render from a server page.

Design note: the spec says the menu items "are links". A Radix radio or checkbox row cannot also be an `<a>`, and the radio/checkbox roles are what tell a screen reader which filter is on. So each row navigates with `router.push(href, { scroll: false })` to an href built by `params.ts`. The URL is still the only view state.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/views/ViewBar.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ViewBar } from "@/components/views/ViewBar";
import { parseView, type ViewPage } from "@/lib/views/params";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function renderBar(page: ViewPage, query: Record<string, string> = {}) {
  render(<ViewBar page={page} view={parseView(page, query)} />);
  return userEvent.setup();
}

// Radix opens a menu from its trigger on Enter; that path does not depend on
// jsdom's pointer-event support.
async function openMenu(user: ReturnType<typeof userEvent.setup>, name: string | RegExp) {
  screen.getByRole("button", { name }).focus();
  await user.keyboard("{Enter}");
  return screen.findByRole("menu");
}

describe("ViewBar", () => {
  beforeEach(() => push.mockClear());

  it("names the view from its filters", () => {
    renderBar("pipeline", { stage: "QUOTED,ACTIVE" });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Open leads · Quoted, Active");
  });

  it("counts the filters that are not default on the Filter button", () => {
    renderBar("contacts", { archived: "true", mine: "true", stage: "NEW" });
    expect(screen.getByRole("button", { name: "Filter, 3 active" })).toBeInTheDocument();
  });

  it("calls the button just Filter when nothing is filtered", () => {
    renderBar("contacts");
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
  });

  it("adds a ticked stage to the URL", async () => {
    const user = renderBar("pipeline");
    await openMenu(user, "Filter");
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Quoted" }));
    expect(push).toHaveBeenCalledWith("/pipeline?stage=QUOTED", { scroll: false });
  });

  it("offers Status on Contacts only", async () => {
    const user = renderBar("pipeline");
    await openMenu(user, "Filter");
    expect(screen.queryByRole("menuitemradio", { name: "Archived" })).toBeNull();
  });

  it("resets the filters and keeps the sort", async () => {
    const user = renderBar("contacts", { archived: "true", mine: "true", sort: "amount" });
    await openMenu(user, /Filter/);
    await user.click(screen.getByRole("menuitem", { name: "Reset filters" }));
    expect(push).toHaveBeenCalledWith("/contacts?sort=amount", { scroll: false });
  });

  it("sorts by the field picked in Sort", async () => {
    const user = renderBar("pipeline");
    await openMenu(user, "Sort");
    await user.click(screen.getByRole("menuitemradio", { name: "Amount" }));
    expect(push).toHaveBeenCalledWith("/pipeline?sort=amount", { scroll: false });
  });

  it("offers Priority on Pipeline only", async () => {
    const user = renderBar("contacts");
    await openMenu(user, "Sort");
    expect(screen.queryByRole("menuitemradio", { name: "Priority" })).toBeNull();
  });

  it("puts Export CSV on Contacts only", () => {
    renderBar("contacts");
    expect(screen.getByRole("link", { name: "Export CSV" })).toHaveAttribute("href", "/api/leads/export");
  });

  it("has no Export CSV on Pipeline", () => {
    renderBar("pipeline");
    expect(screen.queryByRole("link", { name: "Export CSV" })).toBeNull();
  });

  it("puts the Board / Table switch on Pipeline only", () => {
    renderBar("pipeline");
    expect(screen.getByRole("link", { name: "Table" })).toHaveAttribute("href", "/pipeline?view=table");
    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute("aria-current", "page");
  });

  it("has no Board / Table switch on Contacts", () => {
    renderBar("contacts");
    expect(screen.queryByRole("group", { name: "Layout" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `npx vitest run src/components/views/ViewBar.test.tsx`
Expected: FAIL, cannot resolve `@/components/views/ViewBar`.

- [ ] **Step 3: Write `ViewBar.tsx`**

```tsx
// src/components/views/ViewBar.tsx
"use client";

import { useRouter } from "next/navigation";
import { IconArrowsSort, IconDownload, IconFilter } from "@tabler/icons-react";

import { FilterTabs } from "@/components/leads/FilterTabs";
import { StageBadge } from "@/components/leads/StageBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PIPELINE_STATUSES } from "@/lib/leads/pipeline";
import {
  SORT_LABELS,
  filterCount,
  resetFiltersHref,
  sortKeysFor,
  toggleStageHref,
  viewHref,
  viewName,
  type LeadSortKey,
  type LeadView,
  type SortDir,
  type ViewPage,
} from "@/lib/views/params";

// The strip above a lead list, under the page header (#47 step 9, Twenty
// style). Left: the view's name, built from its filters, and on Pipeline the
// Board / Table switch (lg and up). Right: Filter, Sort, and on Contacts
// Export CSV. The record count stays in the page header: one number on screen.
//
// The URL is the only view state. Every menu row navigates to an href built by
// lib/views/params.ts; a Radix radio or checkbox row cannot also be an <a>,
// and those roles are what tell a screen reader which filter is on.
//
// Below lg, Filter, Sort and Export are 44px icon buttons; their words stay as
// the accessible names.

const MENU_LABEL = "text-label text-ink-muted";
const BAR_BUTTON = "max-lg:h-11 max-lg:min-w-11 max-lg:justify-center";

export function ViewBar({ page, view }: { page: ViewPage; view: LeadView }) {
  const router = useRouter();
  const go = (href: string) => router.push(href, { scroll: false });
  const count = filterCount(page, view);
  const name = viewName(page, view);

  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <h2 className="text-title min-w-0 truncate" title={name}>
          {name}
        </h2>
        {page === "pipeline" ? (
          <div className="hidden shrink-0 lg:block">
            <FilterTabs
              label="Layout"
              tabs={[
                { label: "Board", href: viewHref(page, view, { layout: "board" }), active: view.layout === "board" },
                { label: "Table", href: viewHref(page, view, { layout: "table" }), active: view.layout === "table" },
              ]}
            />
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              aria-label={count > 0 ? `Filter, ${count} active` : "Filter"}
              className={BAR_BUTTON}
            >
              <IconFilter size={16} stroke={1.5} aria-hidden="true" />
              <span className="max-lg:sr-only">Filter</span>
              {count > 0 ? (
                <Badge tone="sky" className="tabular-nums">
                  {count}
                </Badge>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {page === "contacts" ? (
              <>
                <DropdownMenuLabel className={MENU_LABEL}>Status</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={view.archived ? "archived" : "active"}
                  onValueChange={(value) => go(viewHref(page, view, { archived: value === "archived" }))}
                >
                  <DropdownMenuRadioItem value="active">Active</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="archived">Archived</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
              </>
            ) : null}

            <DropdownMenuLabel className={MENU_LABEL}>Owner</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={view.mine ? "mine" : "all"}
              onValueChange={(value) => go(viewHref(page, view, { mine: value === "mine" }))}
            >
              <DropdownMenuRadioItem value="all">All leads</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="mine">My leads</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />

            {/* None ticked means every stage. A tick keeps the menu open, so
                several stages can be picked in one visit. */}
            <DropdownMenuLabel className={MENU_LABEL}>Stage</DropdownMenuLabel>
            {PIPELINE_STATUSES.map((stage) => (
              <DropdownMenuCheckboxItem
                key={stage}
                checked={view.stages.includes(stage)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={() => go(toggleStageHref(page, view, stage))}
              >
                <StageBadge status={stage} />
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />

            <DropdownMenuItem disabled={count === 0} onSelect={() => go(resetFiltersHref(page, view))}>
              Reset filters
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" aria-label="Sort" className={BAR_BUTTON}>
              <IconArrowsSort size={16} stroke={1.5} aria-hidden="true" />
              <span className="max-lg:sr-only">Sort</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className={MENU_LABEL}>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={view.sort}
              onValueChange={(value) => go(viewHref(page, view, { sort: value as LeadSortKey, dir: "asc" }))}
            >
              {sortKeysFor(page).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            {/* Priority is one fixed order (overdue, starred, revenue, due),
                so it has no direction. */}
            <DropdownMenuRadioGroup
              value={view.dir}
              onValueChange={(value) => go(viewHref(page, view, { dir: value as SortDir }))}
            >
              <DropdownMenuRadioItem value="asc" disabled={view.sort === "priority"}>
                Ascending
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc" disabled={view.sort === "priority"}>
                Descending
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {page === "contacts" ? (
          // A plain <a>, not a Link: this navigates to a file download, and
          // next/link would try to client-navigate a route that returns CSV.
          // `download` is a hint only — the route's own Content-Disposition
          // names the file. The export is the whole directory, so it ignores
          // the filters: a backup that silently omitted the rows you had
          // filtered out would be wrong in the one way an export must not be.
          <Button asChild size="sm" variant="secondary" className={BAR_BUTTON}>
            <a href="/api/leads/export" download>
              <IconDownload size={16} stroke={1.5} aria-hidden="true" />
              <span className="max-lg:sr-only">Export CSV</span>
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run src/components/views/ViewBar.test.tsx`
Expected: PASS. If a menu does not open in jsdom, try `await user.keyboard("{ArrowDown}")` in `openMenu` (Radix also opens on ArrowDown) before changing anything else.

- [ ] **Step 5: Update the `FilterTabs` comment** (lines 10–13): it is now used by Prospects, Reports and the Pipeline Board / Table switch, not by the Contacts or Pipeline filter rows. Change "used by the Contacts directory and the Pipeline board. A server component:" to "used by Prospects, Reports and the view bar's Board / Table switch. No directive, so server and client components both render it:".

- [ ] **Step 6: Commit**

```bash
git add src/components/views/ViewBar.tsx src/components/views/ViewBar.test.tsx src/components/leads/FilterTabs.tsx
git commit -m "feat(views): view bar with view name, Filter, Sort and Export (refs #47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Wire Contacts

**Files:**
- Modify: `src/app/(app)/contacts/page.tsx` (whole file)

**Interfaces:**
- Consumes: `parseView`, `stagesKey`, `RawSearchParams` (Task 2); `sortLeads` (Task 3); `getAllContacts` (Task 4); `LeadsTable` (Task 7); `ViewBar` (Task 8); `ContactsList` (unchanged).

- [ ] **Step 1: Replace the page**

```tsx
import type { Metadata } from "next";

import { getCurrentOrg } from "@/lib/organizations/current";
import { getAllContacts } from "@/lib/leads/queries";
import { sortLeads } from "@/lib/leads/sort";
import { parseView, stagesKey, type RawSearchParams } from "@/lib/views/params";
import { ContactsList } from "@/components/contacts/ContactsList";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { ViewBar } from "@/components/views/ViewBar";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  // The URL is the only view state (lib/views/params.ts). The @header slot
  // parses the same params and makes the same query, so its count is this
  // list's own.
  const view = parseView("contacts", await searchParams);

  const { orgId, userId, orgTimezone, currencyFormat } = await getCurrentOrg();
  // Filtering happens in the query, not in the list — assigned_to is indexed
  // (idx_leads_tenant_assignee) and this keeps the "empty" state honest: the
  // count the user sees is the count the database returned. Sorting happens
  // here, on a copy: the query result is cache()d and shared with the header.
  const contacts = sortLeads(
    await getAllContacts(orgId, view.archived, view.mine ? userId : undefined, stagesKey(view.stages)),
    view.sort,
    view.dir,
  );

  const emptyMessage =
    view.stages.length > 0
      ? "No contacts in these stages."
      : view.mine
        ? "No contacts are assigned to you."
        : view.archived
          ? "No archived leads."
          : "No contacts yet.";

  return (
    <div className="space-y-4">
      <ViewBar page="contacts" view={view} />

      {/* The table at lg and up; the two-line row list with 44px call, text
          and email targets below it. Both get the same sorted rows. */}
      <div className="hidden lg:block">
        <LeadsTable
          page="contacts"
          leads={contacts}
          view={view}
          orgTimezone={orgTimezone}
          currencyFormat={currencyFormat}
          emptyMessage={emptyMessage}
        />
      </div>
      <div className="lg:hidden">
        <ContactsList contacts={contacts} emptyMessage={emptyMessage} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Check it in the browser** (dev server from Task 1; reload `/contacts`).
  - 1440px light and dark: view bar shows "Active leads", Filter, Sort, Export CSV. Table has icon headers. Header count equals the number of rows.
  - Click a header: URL gains `?sort=…`, arrow shows, reload keeps it. Click again: direction flips.
  - Filter → Archived, My leads, a stage: view name and header count change; Reset clears them.
  - Drag a column by its grip; resize a column. Both work, and the row still opens.
  - Click a row: the edit drawer opens. Click a Call icon: no drawer.
  - Read `getComputedStyle` of a body `<tr>`: `position` is `relative`, and the name button's `::after` covers the row (click the Owner cell: drawer opens).
  - 375px light and dark: view bar fits, no sideways scroll (`document.documentElement.scrollWidth <= innerWidth`), Filter/Sort/Export are 44px icon buttons, the row list shows.
  - `read_console_messages` with `onlyErrors`: none.
  - Fix in-scope critique findings from Task 1 here. Take a screenshot at 1440 for the PR.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/contacts/page.tsx"
git commit -m "feat(contacts): view bar and lead table on Contacts (refs #47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Wire Pipeline (board, table, Focus List)

**Files:**
- Modify: `src/components/pipeline/KanbanBoard.tsx`, `src/components/pipeline/FocusList.tsx`
- Modify: `src/app/(app)/pipeline/page.tsx` (whole file)
- Test: `src/components/pipeline/KanbanBoard.test.tsx` (add tests)

**Interfaces:**
- Consumes: `leadComparator`, `sortLeads` (Task 3); `parseView`, `stagesKey`, `boardKey`, `LeadSortKey`, `SortDir` (Task 2); `LeadsTable` (Task 7); `ViewBar` (Task 8).
- Produces: `KanbanBoard` and `FocusList` gain optional props `lanes?: readonly PipelineStatus[]` (default `PIPELINE_STATUSES`), `sort?: LeadSortKey` (default `"priority"`), `dir?: SortDir` (default `"asc"`).

- [ ] **Step 1: Write the failing board tests** — add to `src/components/pipeline/KanbanBoard.test.tsx`, inside the `describe` block:

```tsx
  it("shows only the lanes it is given", () => {
    render(
      <KanbanBoard leads={leads} orgTimezone="UTC" currencyFormat="USD" lanes={["QUOTED"]} />,
    );
    expect(screen.getByRole("heading", { name: "Quoted" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "New" })).toBeNull();
  });

  it("orders the cards in a lane by the chosen sort", () => {
    const two = [
      { ...lead("z", "Zed Young", "NEW", null), estimated_revenue: 5000 },
      { ...lead("a", "Abe Arnold", "NEW", null), estimated_revenue: 100 },
    ] as Lead[];
    const order = () =>
      [...screen.getByRole("heading", { name: "New" }).closest("section")!.querySelectorAll("p.font-medium.truncate")]
        .map((p) => p.textContent);

    const { unmount } = render(<KanbanBoard leads={two} orgTimezone="UTC" currencyFormat="USD" />);
    expect(order()).toEqual(["Zed Young", "Abe Arnold"]);
    unmount();

    render(<KanbanBoard leads={two} orgTimezone="UTC" currencyFormat="USD" sort="name" dir="asc" />);
    expect(order()).toEqual(["Abe Arnold", "Zed Young"]);
  });
```

The `p.font-medium.truncate` selector is the card's name line in `PipelineCardFields.tsx` (`text-body-md truncate font-medium`). If it matches more than the names, read the DOM and pick the name line by its text instead.

- [ ] **Step 2: Run the tests and see them fail**

Run: `npx vitest run src/components/pipeline/KanbanBoard.test.tsx`
Expected: FAIL — "New" heading still present; name order unchanged.

- [ ] **Step 3: Add the props to `KanbanBoard`**

```tsx
import { leadComparator } from "@/lib/leads/sort";
import type { LeadSortKey, SortDir } from "@/lib/views/params";

export function KanbanBoard({
  leads,
  orgTimezone,
  currencyFormat,
  // The view bar's Stage filter hides the lanes it does not pick, and its
  // Sort orders the cards inside each lane. Priority is the default order.
  lanes = PIPELINE_STATUSES,
  sort = "priority",
  dir = "asc",
}: {
  leads: Lead[];
  orgTimezone: string;
  currencyFormat: string;
  lanes?: readonly PipelineStatus[];
  sort?: LeadSortKey;
  dir?: SortDir;
}) {
  // ...state unchanged...
  const columns = groupLeadsByStatus(boardLeads, leadComparator(sort, dir));
```

and render `{lanes.map((status) => (` instead of `{PIPELINE_STATUSES.map((status) => (`.

- [ ] **Step 4: Same props in `FocusList`** — identical signature additions, `groupLeadsByStatus(focusLeads, leadComparator(sort, dir))`, and `{lanes.map((status) => (` instead of `{PIPELINE_STATUSES.map((status) => (`. Same imports.

- [ ] **Step 5: Run the tests and see them pass**

Run: `npx vitest run src/components/pipeline/KanbanBoard.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 6: Replace the Pipeline page**

```tsx
import type { Metadata } from "next";

import { getCurrentOrg } from "@/lib/organizations/current";
import { getPipelineLeads } from "@/lib/leads/queries";
import { PIPELINE_STATUSES } from "@/lib/leads/pipeline";
import { sortLeads } from "@/lib/leads/sort";
import { boardKey, parseView, stagesKey, type RawSearchParams } from "@/lib/views/params";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { FocusList } from "@/components/pipeline/FocusList";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { ViewBar } from "@/components/views/ViewBar";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  // The URL is the only view state (lib/views/params.ts). The @header slot
  // parses the same params and makes the same query.
  const view = parseView("pipeline", await searchParams);

  const { orgId, orgTimezone, currencyFormat, userId } = await getCurrentOrg();
  // Filtered in the query rather than in the board, so the Kanban's own
  // grouping adapter (lib/leads/pipeline.ts) is untouched and the column
  // counts stay truthful. Nothing here is coupled to any automated routing —
  // the spam shield's review queue is a separate surface entirely, and this
  // filter never sets or reads `archived`.
  const leads = await getPipelineLeads(orgId, view.mine ? userId : undefined, stagesKey(view.stages));

  // A lane the Stage filter did not pick is hidden, not shown empty.
  const lanes = view.stages.length > 0 ? view.stages : PIPELINE_STATUSES;

  // `key` is load-bearing, not decoration. The board and the Focus List seed
  // useState(leads) so a drag can update optimistically, and React keeps that
  // state across a re-render at the same tree position — so changing a filter
  // would re-run the server query and then display the PREVIOUS result set,
  // with no error and a green build. boardKey changes with every param that
  // changes the fetched leads (owner, stage) and not with sort or layout.
  const key = boardKey(view);

  return (
    <div className="flex h-full flex-col gap-4">
      <ViewBar page="pipeline" view={view} />

      {/* Desktop: the board, or the table when ?view=table. Below lg: the
          Focus List, whatever the layout param says. */}
      {view.layout === "table" ? (
        <div className="hidden min-h-0 flex-1 overflow-y-auto lg:block">
          <LeadsTable
            page="pipeline"
            leads={sortLeads(leads, view.sort, view.dir)}
            view={view}
            orgTimezone={orgTimezone}
            currencyFormat={currencyFormat}
            emptyMessage="No open leads match this view."
          />
        </div>
      ) : (
        <div className="hidden min-h-0 flex-1 lg:block">
          <KanbanBoard
            key={key}
            leads={leads}
            lanes={lanes}
            sort={view.sort}
            dir={view.dir}
            orgTimezone={orgTimezone}
            currencyFormat={currencyFormat}
          />
        </div>
      )}
      <div className="lg:hidden">
        <FocusList
          key={key}
          leads={leads}
          lanes={lanes}
          sort={view.sort}
          dir={view.dir}
          orgTimezone={orgTimezone}
          currencyFormat={currencyFormat}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0.

- [ ] **Step 8: Check it in the browser** (reload `/pipeline`).
  - 1440px light and dark, Board: view bar shows "Open leads", Board/Table switch, Filter, Sort. Header count equals the cards on the board.
  - Filter → Quoted: only the Quoted lane shows; header count matches. Then My leads: the cards change (not the old set). Reset.
  - Sort → Name: cards inside each lane go A–Z. Drag a card to another lane: it moves and saves (reload keeps it).
  - Switch to Table: `?view=table`, five columns, header sort works, resize and drag-to-move work, a row opens the drawer.
  - Reload on `?view=table&sort=amount&dir=desc&stage=NEW,QUOTED`: the same view comes back, header count matches the rows.
  - 375px light and dark: Focus List shows, no Board/Table switch, view bar fits with no sideways scroll, Filter and Sort are 44px.
  - `read_console_messages` with `onlyErrors`: none.
  - Fix in-scope critique findings from Task 1 here. Take screenshots (board and table at 1440, phone at 375) for the PR.

- [ ] **Step 9: Commit**

```bash
git add src/components/pipeline/KanbanBoard.tsx src/components/pipeline/FocusList.tsx src/components/pipeline/KanbanBoard.test.tsx "src/app/(app)/pipeline/page.tsx"
git commit -m "feat(pipeline): view bar, stage lanes, sort and a Board / Table switch (refs #47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Width check, docs, gates

**Files:**
- Modify: `scripts/check-comp-text-widths.mjs` (`ROUTES`, near line 199)
- Modify: `DESIGN.md` (§ Scope near line 137; step-8 note near line 190; new section)
- Modify: `docs/KNOWN_GAPS.md` (test-count mark; the `/prospects` widths gap line)

- [ ] **Step 1: Measure the new tables.** In `ROUTES`, after the `"/pipeline",` entry, add:

```js
  // The Contacts and Pipeline lead tables, since #47 step 9 (DataTable and
  // the view bar). Both viewports are lg and up, so these measure the table,
  // not the phone row list. The view bar's name truncates on purpose; the
  // check is that no header label or cell value is squeezed to nothing.
  "/contacts",
  "/pipeline?view=table",
```

- [ ] **Step 2: Run the width check** (dev server running):

Run: `npm run check:widths`
Expected: the new `/contacts` and `/pipeline?view=table` entries pass at both viewports. The four `/contacts` EDIT drawer / READ panel entries still fail with "no drawer" / "no profile button": that is #66 item 1, out of scope. Report it; do not fix it. Any other failure is in scope: fix it.

- [ ] **Step 3: `DESIGN.md` § Scope.** In the "covers" paragraph, after "Contacts row list (…)," add: "Table View (`DataTable`: Contacts and Pipeline at `lg` and up), the view bar (`ViewBar`),". In "Explicitly does not cover", remove "Table View, " so it reads "Saved Views, Group-by, Kanban compact/dense toggle, Team Role Management UI."

- [ ] **Step 4: `DESIGN.md` step-8 note.** Replace "Export CSV is a view action, not a page action: it stays beside the filters (step 9's view bar owns it next)." with "Export CSV is a view action, not a page action: it lives in the view bar (Contacts only, #47 step 9)."

- [ ] **Step 5: `DESIGN.md` new section.** Insert directly before `## The Application Shell (2026-08-16)`:

```markdown
## Table View and the view bar (2026-10-13)

Issue #47 step 9. Contacts and Pipeline share both parts.

- **`ViewBar`** (`src/components/views/ViewBar.tsx`) sits under the page
  header. Left: the view's name, built from its filters ("Active leads",
  "Archived · My leads", "Open leads · Quoted, Active"), truncating; on
  Pipeline a Board / Table switch (`lg` and up). Right: **Filter** (Status on
  Contacts, Owner, Stage multi-select, Reset; the button shows how many
  filters are on), **Sort** (one field and a direction; Pipeline adds
  Priority, its default), and Export CSV on Contacts. Below `lg` the three are
  44px icon buttons. The record count stays in the page header.
- **The URL is the only view state.** `src/lib/views/params.ts` parses and
  builds every href; a default is omitted. Filters run in the query, sort on
  the server page (`src/lib/leads/sort.ts`, missing values last both ways).
- **`DataTable`** (`src/components/ui/DataTable.tsx`) is the composed table
  on the `Table` shell: a Tabler icon (`size-4`, stroke 1.75, `ink-muted`) and
  a label in every header; a sortable header is a link with `aria-sort` and an
  arrow; session-only resize and drag-to-move from `table-columns.tsx`; one
  bordered panel, hairline rows about 48px, hover `canvas-soft`; the row opens
  from one stretched button, and links in other cells sit above it. No
  selection, inline edit or grouping. Lead columns live once in
  `src/components/leads/lead-columns.tsx`.
- **Phone:** Contacts keeps its two-line row list and Pipeline its Focus List
  below `lg`. Saved Views and Group-by are not built.
```

- [ ] **Step 6: `docs/KNOWN_GAPS.md`.**
  - Run `npm run test:unit` and read the final "Test Files … Tests …" line.
  - Replace the bold mark `**791 tests, 107 suites**` with the new numbers, and put directly after "as of 2026-10-13 (" a history clause in the file's style: "#47 step 9, Table View and view bar: new `src/lib/views/params.test.ts` N, `src/lib/leads/sort.test.ts` N, `src/lib/leads/queries.test.ts` N, `src/components/ui/DataTable.test.tsx` N, `src/components/leads/LeadsTable.test.tsx` N, `src/components/views/ViewBar.test.tsx` N; 2 added to `dropdown-menu.test.tsx` and 2 to `KanbanBoard.test.tsx`. Before that 791 tests, 107 suites as of 2026-10-13 (" — with each N read from the run, not guessed. Keep the rest of the line as it is.
  - In the `/prospects` column width line, add after its first sentence: "The Contacts and Pipeline tables (`DataTable`, #47 step 9) share the same session-only layout."

- [ ] **Step 7: Run every gate.**

Run each and read its exit code (`0` clean, `1` findings, `2` could not run — not a pass):

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run check:docs
```

`npm run test:integration` is not needed: no policy, grant, RPC, membership or migration change. `check:residue` is not needed: no test data was made.

- [ ] **Step 8: Commit**

```bash
git add scripts/check-comp-text-widths.mjs DESIGN.md docs/KNOWN_GAPS.md
git commit -m "docs(design): Table View and the view bar; widths check covers both tables (refs #47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: PR, leftovers issue, issue comment

- [ ] **Step 1: Final review.** Invoke `superpowers:requesting-code-review` on the branch diff against `main`. Fix what it finds that is in scope; re-run the affected tests.

- [ ] **Step 2: Open the leftovers issue** (before the PR, so the PR can name it). Body, from the spec's "Out of scope" plus out-of-scope critique findings from Task 1:

```bash
gh issue create --title "Table View follow-ups: Prospects on DataTable, saved column layout, saved views" --label needs-triage --body-file <scratchpad>/leftovers.md
```

`leftovers.md` lists, one numbered item each: Prospects onto `DataTable` and `ViewBar`; saving column widths and order (see the `docs/KNOWN_GAPS.md` entry — pick cookie, localStorage or a row first); Saved Views, Group-by and a rule-builder filter; #66 item 1 (`check:widths` openers for the Contacts drawer) stays in #66; then each out-of-scope critique finding with its page. First line: "Leftovers from #47 step 9 (Table View and view bar)." Note the new issue number.

- [ ] **Step 3: Push and open the PR.** The branch is not `main`, so this push does not deploy. Run `git status` first; `docs/SHOWCASE_RETAKE.md` was untracked before this work and is not part of it — leave it out and say so.

```bash
git push -u origin design/47-step-9-table-view
gh pr create --base main --title "Table View primitive and view bar (#47 step 9)" --body-file <scratchpad>/pr.md
```

`pr.md`: what shipped (DataTable, ViewBar, URL view state, stage filter, Board / Table), critique score before, checks run (1440 and 375, light and dark; gates with exit codes; `check:widths` result incl. the #66 failures), screenshots, "Leftovers: #N", `refs #47`, then the line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 4: Bind the PR** with `mcp__ccd_pr__get_status`, then `bind_pr` if it is not reported. Read CI once and offer Auto-fix if red.

- [ ] **Step 5: Comment on #47** with the PR number, the leftovers issue number, the critique score, and "Box stays unticked until it merges", in the style of the earlier step comments.

- [ ] **Step 6: Tell the founder** the PR number, the leftovers issue number, and anything not finished.
