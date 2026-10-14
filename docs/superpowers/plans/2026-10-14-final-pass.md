# Final Pass (#47 step 10) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the step-10 audit findings and five small leftovers so issue #47 can close.

**Architecture:** The 44px phone rule moves into the shared primitives (`max-sm:` classes), so call sites inherit it. Two accessibility bugs are fixed where they live (`ColumnResizeHandle`, `FocusListCard`). The rest are small, local edits. No schema, no server actions, no new dependencies.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4, Vitest + Testing Library, Tabler icons.

**Spec:** `docs/superpowers/specs/2026-10-14-final-pass-design.md`

## How this plan runs

- The driver (main session) dispatches helpers in **waves, at most 3 at once**. Tasks in one wave touch disjoint files.
- **Helpers never commit.** Each task ends with "Hand back": the helper reports the files it changed and the test output. The driver reviews the diff, runs the tests, and commits.
- Wave 1: Tasks 1, 2, 3. Wave 2: Tasks 4, 5, 6 (Task 4 needs Task 1). Then the driver runs Tasks 7 and 8 alone.

## Global Constraints

- Phone means below Tailwind `sm` (640px). Use `max-sm:` variants only. Desktop must not change.
- Touch target floor: 44px on a phone (`min-h-11` / `size-11` / `min-w-11`), 24px on desktop (WCAG 2.5.8).
- Consume primitives from `src/components/ui/`. Never hand-copy a primitive's class string at a call site.
- Never add `outline-none` to an interactive element. The global `:focus-visible` rule is the focus ring.
- Tabler icons only, outline style. No `lucide-react`.
- Forms: do not add, remove or rename any `name=` field (`.claude/rules/forms.md`).
- Tests: `npx vitest run <file>` while working. **Never `npm test`.**
- No new copy that states a business fact. Rewording keeps the same facts.
- Leave existing call-site `max-sm:h-11` / `max-sm:size-11` classes in place.

## Review Focus

- A Button that a caller squares to an icon (`size-7`, `w-8`, `size-4`) gets taller but not wider on a phone (for example 34×44). Expected: icon-only buttons are 44×44. Pinned in Task 4 (Dismiss, Help, HelpTooltip) and by the browser probe in Task 7.
- The 16px "What's this?" glyph sits inside a field label. A 44px `min-h` on it would push every label row to 44px. Expected: the glyph looks the same; only its invisible hit area grows. Pinned in Task 4 (`max-sm:min-h-0` test).
- Space or Enter pressed while the phone stage select has focus. Expected: the select acts, the drawer does not open. Pinned in Task 3.
- A resize handle before anyone has dragged a column. Expected: `aria-valuenow` is still present. Pinned in Task 2.
- A browser that sends neither `sec-ch-ua-platform` nor a recognisable user agent. Expected: the keycap reads `Ctrl K` (the non-Apple default). Pinned in Task 5.

---

## Wave 1

### Task 1: 44px phone targets in the shared primitives

**Files:**
- Modify: `src/components/ui/Button.tsx` (the `SIZES` map)
- Modify: `src/components/ui/Input.tsx`, `src/components/ui/Select.tsx`, `src/components/ui/Textarea.tsx` (the field's `className`)
- Modify: `src/components/ui/Checkbox.tsx` (the Root's `className`)
- Test: `src/components/ui/Button.test.tsx`, `Input.test.tsx`, `Select.test.tsx`, `Textarea.test.tsx`, `Checkbox.test.tsx`

**Interfaces:**
- Produces: `Button` sizes `sm` and `md` carry `max-sm:min-h-11`. A caller can cancel it with `max-sm:min-h-0` (tailwind-merge keeps the caller's class). Task 4 relies on this.

- [ ] **Step 1: Write the failing tests**

Add to `src/components/ui/Button.test.tsx` inside `describe("Button")`:

```tsx
  it("is at least 44px tall on a phone at the sm and md sizes", () => {
    for (const size of ["sm", "md"] as const) {
      const { unmount } = render(<Button size={size}>Save</Button>);
      expect(screen.getByRole("button")).toHaveClass("max-sm:min-h-11");
      unmount();
    }
  });

  it("lets a caller cancel the phone floor for an inline glyph", () => {
    render(<Button className="max-sm:min-h-0">?</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("max-sm:min-h-0");
    expect(btn).not.toHaveClass("max-sm:min-h-11");
  });
```

Add to `src/components/ui/Input.test.tsx`:

```tsx
  it("is at least 44px tall on a phone", () => {
    render(<Input label="Name" />);
    expect(screen.getByLabelText("Name")).toHaveClass("max-sm:min-h-11");
  });
```

Add to `src/components/ui/Select.test.tsx`:

```tsx
  it("is at least 44px tall on a phone", () => {
    render(<Select label="Status">{options()}</Select>);
    expect(screen.getByLabelText("Status")).toHaveClass("max-sm:min-h-11");
  });
```

Add to `src/components/ui/Textarea.test.tsx` (match the file's existing imports):

```tsx
  it("is at least 44px tall on a phone", () => {
    render(<Textarea label="Notes" />);
    expect(screen.getByLabelText("Notes")).toHaveClass("max-sm:min-h-11");
  });
```

Add to `src/components/ui/Checkbox.test.tsx`:

```tsx
  it("keeps the 16px box but has a 24px hit area, 44px on a phone", () => {
    render(<Checkbox aria-label="Alerts" />);
    const box = screen.getByRole("checkbox", { name: "Alerts" });
    expect(box).toHaveClass("size-4", "relative", "after:absolute", "after:-inset-1", "max-sm:after:-inset-3.5");
  });
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/components/ui/Button.test.tsx src/components/ui/Input.test.tsx src/components/ui/Select.test.tsx src/components/ui/Textarea.test.tsx src/components/ui/Checkbox.test.tsx`
Expected: the 6 new tests FAIL (class not found). Old tests pass.

- [ ] **Step 3: Implement**

`Button.tsx`, replace the `sm` and `md` entries and add one comment line above `SIZES`:

```tsx
// max-sm:min-h-11: every control is 44px tall on a phone (#47 step 10). It is
// min-height, so a caller's own phone size (max-sm:size-11) still wins, and an
// inline glyph can opt out with max-sm:min-h-0.
const SIZES: Record<ButtonSize, string> = {
  sm: "text-body-sm h-7 gap-1.5 px-2 max-sm:min-h-11",
  md: "text-body-md h-8 gap-2 px-3 max-sm:min-h-11",
```

(`lg` is unchanged.)

`Input.tsx` and `Textarea.tsx`: in the field's first `cn(...)` string, append ` max-sm:min-h-11`:

```tsx
          "text-body-md w-full rounded-xs border bg-canvas-pure px-2 py-1 text-ink-main placeholder:text-ink-muted max-sm:min-h-11",
```

`Select.tsx`: same, on the `<select>`:

```tsx
            "text-body-md w-full appearance-none rounded-xs border bg-canvas-pure py-1 pr-7 pl-2 text-ink-main max-sm:min-h-11",
```

`Checkbox.tsx`: first string of the Root's `cn(...)` becomes:

```tsx
        // The box stays 16px; the ::after is its hit area: 24px on desktop
        // (WCAG 2.5.8), 44px on a phone. It belongs to the <button>, so a tap
        // on it toggles the box.
        "relative size-4 shrink-0 rounded-xs border border-hairline bg-canvas-pure transition-colors after:absolute after:-inset-1 after:content-[''] max-sm:after:-inset-3.5",
```

- [ ] **Step 4: Run the tests to see them pass**

Run: the same command as Step 2.
Expected: all PASS.

- [ ] **Step 5: Hand back** (driver reviews and commits)

Commit message the driver uses: `feat(ui): 44px phone floor in Button, Input, Select, Textarea, Checkbox (refs #47, refs #54, refs #61)`

---

### Task 2: Resize handle always reports its width

**Files:**
- Modify: `src/components/ui/table-columns.tsx` (`ColumnResizeHandle`, around line 268–310)
- Test: `src/components/ui/DataTable.test.tsx`

**Interfaces:**
- Consumes: `ColumnLayout<K>` (`widths: Record<K, number> | null`). Unchanged.
- Produces: nothing new for other tasks.

- [ ] **Step 1: Write the failing test**

Add to `src/components/ui/DataTable.test.tsx` inside `describe("DataTable")`:

```tsx
  it("gives every resize handle a current width before any drag", () => {
    renderTable();
    const handles = screen.getAllByRole("separator");
    expect(handles.length).toBeGreaterThan(0);
    for (const handle of handles) {
      expect(handle).toHaveAttribute("aria-valuenow");
      expect(Number(handle.getAttribute("aria-valuenow"))).not.toBeNaN();
    }
  });
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/components/ui/DataTable.test.tsx`
Expected: FAIL, the handle has no `aria-valuenow`.

- [ ] **Step 3: Implement**

In `table-columns.tsx`, add `useLayoutEffect` to the `react` import. In `ColumnResizeHandle`, replace `const width = layout.widths?.[id];` with:

```tsx
  // A focusable separator is a widget, so it must always say where it is
  // (axe aria-required-attr). Until the first drag the table is auto layout
  // and `widths` is null, so the value is the header cell's measured width.
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(0);
  useLayoutEffect(() => {
    const cell = ref.current?.closest("th");
    if (!cell) return;
    const read = () => setMeasured(Math.round(cell.getBoundingClientRect().width));
    read();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(read);
    observer.observe(cell);
    return () => observer.disconnect();
  }, []);
  const width = Math.round(layout.widths?.[id] ?? measured);
```

On the `<div role="separator">`, add `ref={ref}`. `aria-valuenow={width}` stays as written (it is now always a number).

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/components/ui/DataTable.test.tsx`
Expected: all PASS.

- [ ] **Step 5: Hand back**

Commit message: `fix(table): resize handle always reports aria-valuenow (refs #47)`

---

### Task 3: Phone Pipeline card, empty lanes, lane width

**Files:**
- Modify: `src/components/pipeline/FocusListCard.tsx`
- Modify: `src/components/pipeline/FocusList.tsx` (drop "No leads", around line 80)
- Modify: `src/components/pipeline/KanbanColumn.tsx` (`min-w-64` → `min-w-48`, line 54; drop "No leads", line 74)
- Create: `src/components/pipeline/FocusListCard.test.tsx`
- Create: `src/components/pipeline/FocusList.test.tsx`
- Test: `src/components/pipeline/KanbanBoard.test.tsx`

**Interfaces:**
- Consumes: `FocusListCard` props unchanged: `{ lead: Lead; orgTimezone: string; currencyFormat: string; onStatusChange: (leadId: string, status: PipelineStatus) => void }`.
- Produces: the card's open control is a `<button>` named `Open {client_name}`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/pipeline/FocusListCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Lead } from "@/lib/leads/queries";

vi.mock("@/components/leads/EditLeadDrawer", () => ({
  EditLeadDrawer: ({ open }: { open: boolean }) => (open ? <div data-testid="drawer" /> : null),
}));
vi.mock("@/components/leads/AssigneeLabel", () => ({ AssigneeLabel: () => null }));

const { FocusListCard } = await import("./FocusListCard");

const lead = {
  id: "l1",
  client_name: "Dana Rivers",
  company: "Rivers Roofing",
  status: "NEW",
  estimated_revenue: 1000,
  next_action_at: "2099-01-01T15:00:00.000Z",
  is_starred: false,
  assigned_to: null,
} as unknown as Lead;

function renderCard() {
  const onStatusChange = vi.fn();
  const view = render(
    <FocusListCard lead={lead} orgTimezone="UTC" currencyFormat="USD" onStatusChange={onStatusChange} />,
  );
  return { onStatusChange, ...view };
}

describe("FocusListCard", () => {
  it("is not one big button with a control inside it", () => {
    const { container } = renderCard();
    expect(container.querySelector('[role="button"]')).toBeNull();
  });

  it("opens the lead from its own button", async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: "Open Dana Rivers" }));
    expect(screen.getByTestId("drawer")).toBeInTheDocument();
  });

  it("does not open the lead when Enter or Space is pressed on the stage select", async () => {
    const user = userEvent.setup();
    renderCard();
    screen.getByRole("combobox", { name: "Status for Dana Rivers" }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(screen.queryByTestId("drawer")).toBeNull();
  });

  it("moves the lead when the stage select changes", async () => {
    const user = userEvent.setup();
    const { onStatusChange } = renderCard();
    await user.selectOptions(screen.getByRole("combobox", { name: "Status for Dana Rivers" }), "QUOTED");
    expect(onStatusChange).toHaveBeenCalledWith("l1", "QUOTED");
  });
});
```

Create `src/components/pipeline/FocusList.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Lead } from "@/lib/leads/queries";

vi.mock("@/lib/leads/actions", () => ({ updateLeadStatus: vi.fn(), createLead: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/components/leads/EditLeadDrawer", () => ({ EditLeadDrawer: () => null }));
vi.mock("@/components/leads/CreateLeadDrawer", () => ({ CreateLeadSheet: () => null }));
vi.mock("@/components/leads/AssigneeLabel", () => ({ AssigneeLabel: () => null }));

const { FocusList } = await import("./FocusList");

const leads = [
  {
    id: "l1",
    client_name: "Dana Rivers",
    company: null,
    status: "NEW",
    estimated_revenue: 1000,
    next_action_at: "2099-01-01T15:00:00.000Z",
    is_starred: false,
    assigned_to: null,
  },
] as unknown as Lead[];

describe("FocusList", () => {
  it("shows only '+ New' in an empty stage, no 'No leads' line", () => {
    render(<FocusList leads={leads} orgTimezone="UTC" currencyFormat="USD" />);
    expect(screen.queryByText("No leads")).toBeNull();
    expect(screen.getByRole("button", { name: "New lead in Discovery" })).toBeInTheDocument();
  });
});
```

Add to `src/components/pipeline/KanbanBoard.test.tsx` inside `describe("KanbanBoard — lanes")`:

```tsx
  it("shows only '+ New' in an empty lane, no 'No leads' line", () => {
    renderBoard();
    expect(screen.queryByText("No leads")).toBeNull();
    expect(screen.getByRole("button", { name: "New lead in Discovery" })).toBeInTheDocument();
  });
```

If `FocusListCard.test.tsx` fails on an import that is not mocked (for example a module `PipelineCardFields` pulls in), mock it at its boundary the same way `KanbanBoard.test.tsx` does. Do not change the component to make the test easier.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/components/pipeline`
Expected: FocusListCard tests 1–3 FAIL (the card is `role="button"`; no "Open Dana Rivers" button; Enter on the select opens the drawer). Both "No leads" tests FAIL. The select-change test may already pass.

- [ ] **Step 3: Implement FocusListCard**

Replace the returned JSX in `FocusListCard.tsx` with:

```tsx
  return (
    <>
      {/* Not a role="button" wrapper: that put the stage <select> inside a
          button (axe nested-interactive), and Space or Enter on the select
          bubbled up and opened the drawer. One real button stretches over the
          card instead — the DataTable row pattern. The fields ignore the
          pointer so a tap anywhere on them lands on that button; the select
          sits above it and keeps its own clicks and keys. */}
      <Card cold={overdue} className="relative w-full p-3 transition-colors hover:bg-canvas-soft">
        <button
          type="button"
          aria-label={`Open ${lead.client_name}`}
          onClick={() => setOpen(true)}
          className="absolute inset-0 rounded-lg"
        />

        {/* The same two Grouped rows KanbanCard renders — this is that card's
            mobile twin, so the two must never show different fields. */}
        <div className="pointer-events-none">
          <PipelineCardFields
            lead={lead}
            cold={overdue}
            orgTimezone={orgTimezone}
            currencyFormat={currencyFormat}
          />
        </div>

        {/* Row three, FocusListCard only. Grouped has no status badge because
            a Kanban column already says the status; this list has no drag, so
            the select is the only way to change status here and needs a row
            of its own. Still name-less and still controlled: it drives a
            Server Action argument directly, never a form post, so there is no
            formData key for it to silently drop. */}
        <div className="relative z-10 mt-2">
          <Select
            aria-label={`Status for ${lead.client_name}`}
            value={lead.status}
            onChange={(e) => onStatusChange(lead.id, e.target.value as PipelineStatus)}
            className="text-body-sm max-sm:min-h-11"
          >
            {PIPELINE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PIPELINE_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <EditLeadDrawer lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
```

(`cursor-pointer` is no longer needed: the button is the pointer target.)

- [ ] **Step 4: Implement the lanes**

`KanbanColumn.tsx` line 54: `"flex min-w-64 flex-1 ..."` → `"flex min-w-48 flex-1 ..."`. Add one comment line above the `className`: `// min-w-48 (192px): four lanes fit beside the sidebar from about 1100px (#54).`

`KanbanColumn.tsx` around line 73 and `FocusList.tsx` around line 80: replace the ternary so an empty lane renders nothing above `LaneAddButton`:

```tsx
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            orgTimezone={orgTimezone}
            currencyFormat={currencyFormat}
            dragging={draggingLeadId === lead.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {/* An empty lane shows only "+ New": "No leads" above it said the same
            thing twice (#68). */}
        <LaneAddButton status={status} onAdd={onAdd} />
```

In `FocusList.tsx` the same shape, with `groups[status].map((lead) => <FocusListCard … />)` and `<LaneAddButton status={status} onAdd={setAddingIn} />`. Keep every prop the file already passes.

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run src/components/pipeline`
Expected: all PASS.

- [ ] **Step 6: Hand back**

Commit message: `fix(pipeline): phone card opens from its own button; narrower lanes; empty lane shows only + New (refs #47, refs #54, refs #68)`

---

## Wave 2

### Task 4: Icon-only targets and the header Help button

Needs Task 1 merged (the `max-sm:min-h-0` opt-out).

**Files:**
- Modify: `src/components/help/HelpTooltip.tsx` (trigger `className`, line 33)
- Modify: `src/components/shell/HelpTrigger.tsx` (`className`, line 25)
- Modify: `src/components/agenda/TaskDismissButton.tsx` (add `className`)
- Modify: `src/components/prospects/ProspectRow.tsx` (map link `className`, around line 106)
- Create: `src/components/help/HelpTooltip.test.tsx`
- Create: `src/components/agenda/TaskDismissButton.test.tsx`
- Create: `src/components/shell/HelpTrigger.test.tsx`

**Interfaces:**
- Consumes: Button's `max-sm:min-h-11` (Task 1).

- [ ] **Step 1: Write the failing tests**

`src/components/help/HelpTooltip.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/help/HelpContext", () => ({ useHelp: () => ({ openHelp: vi.fn() }) }));

const { HelpTooltip } = await import("./HelpTooltip");

describe("HelpTooltip", () => {
  it("keeps the 16px glyph but has a 24px hit area, 44px on a phone", () => {
    render(<HelpTooltip topicId="webhook" blurb="Signed posts." />);
    const trigger = screen.getByRole("button", { name: "What's this?" });
    expect(trigger).toHaveClass("size-4", "relative", "after:absolute", "after:-inset-1", "max-sm:after:-inset-3.5");
  });

  it("does not take Button's 44px phone height, so a label row stays one line", () => {
    render(<HelpTooltip topicId="webhook" blurb="Signed posts." />);
    const trigger = screen.getByRole("button", { name: "What's this?" });
    expect(trigger).toHaveClass("max-sm:min-h-0");
    expect(trigger).not.toHaveClass("max-sm:min-h-11");
  });
});
```

`src/components/agenda/TaskDismissButton.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tasks/actions", () => ({ dismissTask: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { TaskDismissButton } = await import("./TaskDismissButton");

describe("TaskDismissButton", () => {
  it("is 44px square on a phone", () => {
    render(<TaskDismissButton taskId="t1" title="Call back" />);
    expect(screen.getByRole("button", { name: "Dismiss Call back" })).toHaveClass("max-sm:size-11");
  });
});
```

`src/components/shell/HelpTrigger.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/help/HelpContext", () => ({ useHelp: () => ({ openHelp: vi.fn() }) }));

const { HelpTrigger } = await import("./HelpTrigger");

describe("HelpTrigger", () => {
  it("is 44px square on a phone", () => {
    render(<HelpTrigger />);
    expect(screen.getByRole("button", { name: "Help" })).toHaveClass("max-sm:size-11");
  });
});
```

Check each component's real import paths before running (`useHelp` lives in `@/components/help/HelpContext`; `dismissTask` in `@/lib/tasks/actions`). If a path differs, fix the mock, not the component.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/components/help/HelpTooltip.test.tsx src/components/agenda/TaskDismissButton.test.tsx src/components/shell/HelpTrigger.test.tsx`
Expected: FAIL (classes missing).

- [ ] **Step 3: Implement**

`HelpTooltip.tsx` trigger:

```tsx
          // The glyph stays 16px inside the field label. Its ::after is the
          // hit area: 24px on desktop (WCAG 2.5.8), 44px on a phone.
          // max-sm:min-h-0 cancels Button's phone floor, which would make the
          // whole label row 44px tall.
          className="relative size-4 shrink-0 gap-0 rounded-full p-0 after:absolute after:-inset-1 after:content-[''] max-sm:min-h-0 max-sm:after:-inset-3.5"
```

`HelpTrigger.tsx`: `className="w-8 px-0 max-sm:size-11"`.

`TaskDismissButton.tsx`: add `className="max-sm:size-11"` to the `<Button>`.

`ProspectRow.tsx` map link: `className="-my-1 shrink-0 px-1 max-sm:-my-3 max-sm:size-11"` (it measured 29–34px wide on a phone because the flex row shrank it).

- [ ] **Step 4: Run them to see them pass**

Run: the same command as Step 2.
Expected: all PASS.

- [ ] **Step 5: Hand back**

Commit message: `fix(ui): 44px icon-only targets on a phone; 24px help glyph hit area (refs #47, refs #54, refs #61, refs #68)`

---

### Task 5: Ctrl K on Windows, ⌘K on Apple

**Files:**
- Create: `src/lib/shell/platform.ts`
- Create: `src/lib/shell/platform.test.ts`
- Create: `src/components/shell/CommandTrigger.test.tsx`
- Modify: `src/components/shell/CommandTrigger.tsx`
- Modify: `src/components/shell/Header.tsx` (prop pass-through)
- Modify: `src/components/shell/AppShell.tsx` (prop pass-through)
- Modify: `src/app/(app)/layout.tsx` (read the request headers)

**Interfaces:**
- Produces: `export function isApplePlatform(platformHint: string | null, userAgent: string | null): boolean` and `export function shortcutLabel(apple: boolean): "⌘K" | "Ctrl K"` in `src/lib/shell/platform.ts`.
- `CommandTrigger` takes `{ shortcut: "⌘K" | "Ctrl K" }`. `Header` and `AppShell` take and pass `shortcut` with the same type.

- [ ] **Step 1: Write the failing tests**

`src/lib/shell/platform.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { isApplePlatform, shortcutLabel } from "./platform";

describe("isApplePlatform", () => {
  it("trusts the client hint first", () => {
    expect(isApplePlatform('"macOS"', null)).toBe(true);
    expect(isApplePlatform('"iOS"', null)).toBe(true);
    expect(isApplePlatform('"Windows"', "Macintosh")).toBe(false);
  });

  it("falls back to the user agent", () => {
    expect(isApplePlatform(null, "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe(true);
    expect(isApplePlatform(null, "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
    expect(isApplePlatform(null, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
  });

  it("defaults to not Apple when it cannot tell", () => {
    expect(isApplePlatform(null, null)).toBe(false);
    expect(isApplePlatform("", "")).toBe(false);
  });
});

describe("shortcutLabel", () => {
  it("names the key the person actually has", () => {
    expect(shortcutLabel(true)).toBe("⌘K");
    expect(shortcutLabel(false)).toBe("Ctrl K");
  });
});
```

`src/components/shell/CommandTrigger.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/shell/ShellContext", () => ({ useShell: () => ({ openCommand: vi.fn() }) }));

const { CommandTrigger } = await import("./CommandTrigger");

describe("CommandTrigger", () => {
  it("shows Ctrl K off Apple", () => {
    render(<CommandTrigger shortcut="Ctrl K" />);
    expect(screen.getByRole("button", { name: "Search" })).toHaveTextContent("Ctrl K");
  });

  it("shows ⌘K on Apple", () => {
    render(<CommandTrigger shortcut="⌘K" />);
    expect(screen.getByRole("button", { name: "Search" })).toHaveTextContent("⌘K");
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/lib/shell/platform.test.ts src/components/shell/CommandTrigger.test.tsx`
Expected: FAIL (module not found; `shortcut` prop ignored).

- [ ] **Step 3: Implement `platform.ts`**

```ts
// Which modifier the person's keyboard has, decided on the server so the
// search keycap never flashes from one label to the other after hydration
// (#66). The ⌘K / Ctrl-K listener in ShellContext accepts both either way;
// this only picks the words printed on the keycap.
//
// sec-ch-ua-platform is the clean signal (Chromium sends it, quoted:
// "macOS"). Safari and Firefox do not, so the user agent is the fallback.
// When neither says, the answer is "not Apple": most people who reach this
// CRM from an unknown browser are on Windows.
export function isApplePlatform(platformHint: string | null, userAgent: string | null): boolean {
  const hint = platformHint?.replaceAll('"', "").trim();
  if (hint) return hint === "macOS" || hint === "iOS";
  return /Macintosh|Mac OS X|iPhone|iPad|iPod/.test(userAgent ?? "");
}

export function shortcutLabel(apple: boolean): "⌘K" | "Ctrl K" {
  return apple ? "⌘K" : "Ctrl K";
}
```

- [ ] **Step 4: Implement the plumbing**

`CommandTrigger.tsx`: the function takes `{ shortcut }: { shortcut: "⌘K" | "Ctrl K" }`, and the `<kbd>` body becomes `{shortcut}`. Add `max-sm:min-w-11` to the Button's `className` (`"gap-2 max-sm:min-w-11"`). Update the comment that says "⌘K" to say the label comes from the server (`src/lib/shell/platform.ts`).

`Header.tsx`: add `shortcut: "⌘K" | "Ctrl K"` to its props and render `<CommandTrigger shortcut={shortcut} />`.

`AppShell.tsx`: add `shortcut: "⌘K" | "Ctrl K";` to its props type (with a one-line comment: `// The search keycap's label, read from the request in the (app) layout.`), destructure it, and pass `shortcut={shortcut}` to `<Header>`.

`src/app/(app)/layout.tsx`: import `headers` from `next/headers` beside `cookies`, and `isApplePlatform`, `shortcutLabel` from `@/lib/shell/platform`. Extend the existing `Promise.all` to `[getCurrentOrg(), cookies(), headers()]`, destructuring `headerStore`. Then:

```tsx
  const shortcut = shortcutLabel(
    isApplePlatform(headerStore.get("sec-ch-ua-platform"), headerStore.get("user-agent")),
  );
```

Pass `shortcut={shortcut}` to `<AppShell>`. The layout is already dynamic (it reads cookies), so this costs nothing.

`src/components/shell/Header.test.tsx` renders `<Header {...PROPS}>`. Add `shortcut: "Ctrl K" as const` to its `PROPS` object so it type-checks.

- [ ] **Step 5: Run the tests and typecheck**

Run: `npx vitest run src/lib/shell/platform.test.ts src/components/shell`
Expected: all PASS.
Run: `npm run typecheck`
Expected: exit 0. If another file renders `<AppShell>` or `<Header>` (search with `grep -rn "<AppShell\|<Header" src`), give it the prop too.

- [ ] **Step 6: Hand back**

Commit message: `fix(shell): search keycap shows Ctrl K off Apple, decided on the server (refs #47, refs #66)`

---

### Task 6: Empty states, Reports export, Prospects wording, width-check openers

**Files:**
- Modify: `src/components/ui/DataTable.tsx` (`emptyMessage` type)
- Modify: `src/components/leads/LeadsTable.tsx` (`emptyMessage` type)
- Modify: `src/components/contacts/ContactsList.tsx` (`emptyMessage` type)
- Create: `src/components/views/EmptyViewMessage.tsx`
- Create: `src/components/views/EmptyViewMessage.test.tsx`
- Modify: `src/app/(app)/contacts/page.tsx`, `src/app/(app)/pipeline/page.tsx`
- Modify: `src/app/(app)/reports/page.tsx` (Export button `className`)
- Modify: `src/app/(app)/prospects/page.tsx`, `src/app/(app)/prospects/import/page.tsx` (copy)
- Modify: `scripts/check-comp-text-widths.mjs` (`OPEN_EDIT_DRAWER`, `OPEN_READ_PANEL`)

**Interfaces:**
- Consumes: `viewHref(page, view, change?)`, `filterCount(page, view)` from `src/lib/views/params.ts`; `ViewPage`, `LeadView` types from the same file (`defaultView` in the test only).
- Produces: `EmptyViewMessage({ page, view, text }: { page: ViewPage; view: LeadView; text: string })`. `emptyMessage` props become `ReactNode`.

- [ ] **Step 1: Write the failing test**

`src/components/views/EmptyViewMessage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { defaultView } from "@/lib/views/params";
import { EmptyViewMessage } from "./EmptyViewMessage";

describe("EmptyViewMessage", () => {
  it("offers a way back when a filter hides everything", () => {
    const view = { ...defaultView("contacts"), mine: true };
    render(<EmptyViewMessage page="contacts" view={view} text="No contacts are assigned to you." />);
    expect(screen.getByText("No contacts are assigned to you.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show all" })).toHaveAttribute("href", "/contacts");
  });

  it("shows only the text when no filter is on", () => {
    render(<EmptyViewMessage page="contacts" view={defaultView("contacts")} text="No contacts yet." />);
    expect(screen.getByText("No contacts yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Show all" })).toBeNull();
  });
});
```

Add a third test so "Show all" keeps the layout:

```tsx
  it("keeps the table layout and sort when it clears the filters", () => {
    const view = { ...defaultView("pipeline"), mine: true, layout: "table" as const };
    render(<EmptyViewMessage page="pipeline" view={view} text="No open leads match this view." />);
    expect(screen.getByRole("link", { name: "Show all" })).toHaveAttribute("href", "/pipeline?view=table");
  });
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/components/views/EmptyViewMessage.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `EmptyViewMessage.tsx`**

```tsx
import Link from "next/link";

import { filterCount, viewHref, type LeadView, type ViewPage } from "@/lib/views/params";

// The empty message of a lead list, plus a way back when it is empty only
// because a filter hides everything (#68). "No contacts are assigned to you."
// used to be a dead end. With no filter on, it is just the text. "Show all"
// clears the filters only: the sort and the Board / Table layout stay.
export function EmptyViewMessage({ page, view, text }: { page: ViewPage; view: LeadView; text: string }) {
  if (filterCount(page, view) === 0) return <>{text}</>;
  const showAll = viewHref(page, view, { archived: false, mine: false, stages: [] });
  return (
    <>
      {text}{" "}
      <Link href={showAll} className="text-accent underline-offset-2 hover:underline">
        Show all
      </Link>
    </>
  );
}
```

(Before writing the link classes, check how the view bar's Reset or other inline links are styled — `grep -rn "text-accent" src/components/views src/components/contacts` — and use the same classes so there is one link style.)

- [ ] **Step 4: Widen `emptyMessage` to `ReactNode`**

In `DataTable.tsx`, `LeadsTable.tsx` and `ContactsList.tsx`, change `emptyMessage: string` / `emptyMessage?: string` to `emptyMessage: ReactNode` / `emptyMessage?: ReactNode`, importing `type ReactNode` from `react`. No other change.

- [ ] **Step 5: Use it on the pages**

`contacts/page.tsx`: keep the `emptyMessage` string as `emptyText`, then:

```tsx
  const emptyMessage = <EmptyViewMessage page="contacts" view={view} text={emptyText} />;
```

`pipeline/page.tsx`: `emptyMessage={<EmptyViewMessage page="pipeline" view={view} text="No open leads match this view." />}`.

- [ ] **Step 6: Reports Export on a phone**

`reports/page.tsx`, the Export `<Button>`: `className="ml-auto max-sm:ml-0 max-sm:h-11"`. Update the comment above it with one line: `// Below sm the four 44px tabs fill the row, so Export sits under them on the left edge instead of floating right alone.`

- [ ] **Step 7: Prospects wording**

`prospects/page.tsx`, the description `<p>` text becomes:
`Your cold outreach list. Ring one, learn an email address, then promote it into a real lead.`

`prospects/import/page.tsx`, the first sentence becomes:
`Load a Google Business Profile export.` (the rest of the paragraph is unchanged).

Leave `ProspectImportPanel.tsx`'s error text alone: it names the real export source, which the person needs to fix the file.

- [ ] **Step 8: Width-check openers**

`scripts/check-comp-text-widths.mjs`: in both `OPEN_EDIT_DRAWER` and `OPEN_READ_PANEL`, replace

```js
    const card = document.querySelector('div[role="button"].cursor-pointer');
```

with

```js
    // A Contacts table row's open button (#47 step 9 replaced the cards).
    const card = document.querySelector('table tbody tr button');
```

- [ ] **Step 9: Run the tests and typecheck**

Run: `npx vitest run src/components/views src/components/ui/DataTable.test.tsx src/components/contacts`
Expected: all PASS.
Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 10: Hand back**

Commit message: `fix: Show all on filtered empty states, Reports export on phone, plain Prospects wording, width-check openers (refs #47, refs #66, refs #68)`

---

## Driver only

### Task 7: Verify in the browser and run the gates

- [ ] **Step 1:** `npm run test:unit` once. Expected: exit 0, test count above 855.
- [ ] **Step 2:** `npm run lint` and `npm run typecheck`. Expected: exit 0.
- [ ] **Step 3:** Start the `dev` preview. Sign in with `/api/dev-login`. Re-run the audit probe (axe + 44px + overflow) on `/`, `/pipeline`, `/pipeline?view=table`, `/contacts`, `/prospects`, `/reports`, `/settings`, `/import` at 1440×900 and 375×812, light and dark. After each load under a forced size, take a 0.1-scale screenshot before probing (a hidden pane does not finish streaming under size emulation).
  Expected: axe reports no violations. Below 640px, no control is under 44px except inline text links (the demo banner's "Built by TEKGUYZ") and the skip link. No horizontal overflow.
- [ ] **Step 4:** Pipeline at 1024, 1100, 1280 and 1440: all four lanes visible from 1100 up; card names truncate, amount and due label stay whole. Screenshot 1100.
- [ ] **Step 5:** Phone `/pipeline`: tap a card's text → drawer opens; tap the select → drawer stays shut. Keyboard on desktop width with the Focus List forced (375): Tab to the select, Space → drawer stays shut.
- [ ] **Step 6:** Settings at 375: label rows with a "What's this?" glyph are still one text line tall.
- [ ] **Step 7:** Keycap reads `Ctrl K` in the pane (Windows).
- [ ] **Step 8:** `npm run build` (PowerShell). Expected: exit 0.
- [ ] **Step 9:** `npm run check:widths` with the dev server up. Expected: exit 0, including the two `/contacts` drawer checks at 1440 and 1024.
- [ ] **Step 10:** Commit anything the checks forced, with its own message.

### Task 8: DESIGN.md, docs, issues, PR

- [ ] **Step 1:** Run `/impeccable document` to refresh `DESIGN.md`. Make sure it records: the 44px phone floor lives in the primitives (and the `max-sm:min-h-0` opt-out for inline glyphs); the 24px glyph hit area; lane minimum 192px; the server-decided keycap; filtered empty states offer "Show all".
- [ ] **Step 2:** `npm run check:docs`. Expected: exit 0. Update `docs/KNOWN_GAPS.md` test count if `doc-figures` asks for it.
- [ ] **Step 3:** Commit: `docs(design): refresh DESIGN.md after the final pass (refs #47)`.
- [ ] **Step 4:** Comment on #54, #56, #59, #61, #66, #68: which items this PR fixes. Tick nothing that is not fixed.
- [ ] **Step 5:** Open one new issue for anything still open from this pass (labels `needs-triage`, `size:small`). Tell the founder its number.
- [ ] **Step 6:** Say in one line that `main` auto-deploys and the PR is not yet merged. Push the branch. Open the PR: body says `closes #47`, `refs` each leftover issue it touches, and reminds that #65 (retake showcase pictures) can run once it is live.
