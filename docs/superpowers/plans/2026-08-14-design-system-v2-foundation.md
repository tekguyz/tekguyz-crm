# Design System v2 "Structural Neutral" — Foundation Layer Implementation Plan

> **Historical artifact — shipped 2026-08-14. One thing in it is now wrong.**
> This plan repeatedly states that `--accent` is an unsampled placeholder and
> must never be described as final. That was true when it was written and is
> no longer. `--accent` was sampled from the CRM's brand mark later the same
> day and is final: `oklch(0.53 0.181 263.2)` light / `oklch(0.70 0.155 263.2)`
> dark. See `docs/ADDENDA_LOG.md` § Brand identity + `--accent` sampling. Every
> other instruction here still reflects what was built.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Notion High-Voltage token system with DESIGN SYSTEM v2 ("Structural Neutral"), build a shared primitive component library, and prove both work on a dev-only kitchen-sink page in light and dark.

**Architecture:** All colour, radius, elevation, and type values live as CSS custom properties in `src/app/globals.css`, exposed to Tailwind v4 through `@theme`. Presentational primitives in `src/components/ui/` consume only those tokens — no primitive hardcodes a colour or a pixel radius. A dev-only route at `/design` renders every primitive in every state, twice on one page (once under `.light`, once under `.dark`), so both themes are verifiable in a single screenshot.

**Tech Stack:** Next.js 15.5.20 (App Router, Turbopack), React 19.1.0, Tailwind CSS v4 (`@theme`, no `tailwind.config.*`), TypeScript 5, next-themes 0.4.6, `@tabler/icons-react` (new), Vitest + React Testing Library (new, dev only).

**Spec:** `docs/superpowers/specs/2026-08-14-design-system-v2-foundation-design.md` (approved 2026-08-14).

## Global Constraints

Every task's requirements implicitly include this section.

- **Token source of truth is `src/app/globals.css`.** No component hardcodes an OKLCH value, a hex, or a pixel radius. Values are copied verbatim from the spec — do not round, retune, or "improve" them.
- **`--accent` is an unsampled placeholder.** Light `oklch(0.48 0.16 260)`, dark `oklch(0.62 0.15 260)`. No reference screenshots were attached. Never describe it as sampled, final, or verified. It carries an inline comment in the CSS saying so.
- **`--accent` is for primary CTAs, active nav links, focus rings, and inline navigational links only — never decorative.** The decorative pill palette is for category dots and status badges only — never layout borders, never primary buttons.
- **The radius scale overrides Tailwind's stock values under the same utility names.** `rounded-md` is 6px, not Tailwind's 6px-by-coincidence. Never reason from Tailwind radius defaults.
- **The type scale does NOT override Tailwind's names.** `text-xs` / `text-sm` / `text-base` keep their stock meanings. The v2 roles are additional names: `text-display`, `text-h1`, `text-h2`, `text-title`, `text-body-md`, `text-body-sm`, `text-label`, `text-caption`.
- **Any `:not()` in a CSS selector must be a single `:not()` with a comma-separated list.** Chaining `:not(a):not(b)` silently fails to compile under this project's Lightning CSS / Turbopack pipeline — no error, no focus styling.
- **Level 0 (hairline, no shadow) is the default for buttons, cards, inputs, and table rows.** Level 1 is popovers and dropdowns only. Level 2 is modals and the command palette only.
- **Dark-mode elevation uses roughly 3x the light-mode alpha at each stop.** Keep that ratio if the ramps are ever retuned.
- **Runtime dependencies: `@tabler/icons-react` only.** `lucide-react` is removed. devDependencies for the test runner (Task 1) are approved. Nothing else without asking.
- **Icons are outline only, stroke 1.75–2**, `size-5` (20px) in dense contexts, `size-6` (24px) in spacious ones.
- **Must not touch:** any file under `src/lib/actions/`, any migration file, any page under `src/app/(app)/`. The only exception in the whole plan is the icon-name sweep in Task 3, which changes import lines and JSX tag names **only** — no className, prop, layout, or logic edits.
- **File size is a smell, not a wall** (per the Task 0 CLAUDE.md change). Split by responsibility. Do not split a cohesive unit to get under a number.
- Class strings are merged with `cn()` from `src/lib/utils/cn.ts`. Every primitive accepts and merges `className`.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `docs/KNOWN_GAPS.md` | The Known Gaps register, moved out of CLAUDE.md |
| `vitest.config.ts` | Vitest jsdom config + `@` alias |
| `src/test/setup.ts` | Registers `@testing-library/jest-dom` matchers |
| `src/components/ui/Button.tsx` | Button primitive, 4 variants, 2 sizes, loading state |
| `src/components/ui/Input.tsx` | Text input with label / hint / error and aria wiring |
| `src/components/ui/Textarea.tsx` | Same contract as Input, multi-line |
| `src/components/ui/Select.tsx` | Native select with chevron and the same label/error contract |
| `src/components/ui/Card.tsx` | Level-0 surface; owns the Going Cold dashed border |
| `src/components/ui/Badge.tsx` | Status/category pill; owns the Going Cold desaturated tone |
| `src/components/ui/NavItem.tsx` | Sidebar nav link, presentational only |
| `src/components/ui/TableRow.tsx` | Bare `Table` / `TableHead` / `TableBody` / `TableRow` / `TableCell` / `TableHeaderCell` shell |
| `src/components/ui/*.test.tsx` | One test file per new primitive |
| `src/app/(dev)/design/page.tsx` | Kitchen-sink route, dev-only, renders both theme panes |
| `src/app/(dev)/design/ThemePane.tsx` | Wraps all sections in an explicit `.light` or `.dark` scope |
| `src/app/(dev)/design/sections/*.tsx` | One section per primitive family |

**Modified:**

| Path | Change |
|---|---|
| `CLAUDE.md` | Task 0 cleanup (7 items), then Task 12 § UI/UX pointer |
| `docs/ADDENDA_LOG.md` | Receives the closed § 2 roadmap and the compression changelog; gains a new dated addendum |
| `docs/DESIGN.md` | Two additions recorded (`--danger`/`--accent-fg` pairs, dark pill ratio) |
| `package.json` | `@tabler/icons-react` in, `lucide-react` out, test devDeps in, `test` scripts in |
| `src/app/globals.css` | Full v2 token replacement |
| `src/app/layout.tsx` | Geist + Geist Mono out, Inter in |
| 19 files importing `lucide-react` | Import line + JSX tag name only |
| `src/components/ui/{PasswordInput,CopyButton,Skeleton,Modal,dialog,alert-dialog,popover,sonner}.tsx` | Restyle to v2 tokens; two compose new primitives |

---

## Task 0: CLAUDE.md structural cleanup

Runs first because item 1 changes what the rest of the plan is allowed to do when a file grows.

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/ADDENDA_LOG.md`
- Create: `docs/KNOWN_GAPS.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a `CLAUDE.md` whose "File Bloat Prevention" section permits responsibility-based splitting without a hard line cap; `docs/KNOWN_GAPS.md` as the new home of the gaps register.

- [ ] **Step 1: Move the closed roadmap out**

Cut `CLAUDE.md` lines 52–82 (all of `## 2. 15-PHASE TECHNICAL ROADMAP` through the Prompt 15 bullet) verbatim. Append to `docs/ADDENDA_LOG.md` under a new heading:

```markdown
## Archived: 15-Phase Technical Roadmap (initial build, closed)

Relocated from CLAUDE.md § 2 on 2026-08-14. Every entry was already a pointer
into this file; keeping it in the instructions file cost 31 lines a session for
zero operational value. Nothing changed but its address.

<paste the 31 lines verbatim here>
```

Replace the removed CLAUDE.md section with exactly:

```markdown
## 2. Build History

The initial build was a closed 15-phase roadmap (Prompts 1–15), complete. Full
list and per-prompt narrative: `docs/ADDENDA_LOG.md` § Archived: 15-Phase
Technical Roadmap. Do not add new prompts to it — a new feature gets its own
initiative in § 3.
```

- [ ] **Step 2: Move Known Gaps out**

Cut `CLAUDE.md` lines 114–132 (the `## Known Gaps` heading, its preamble paragraph, and all 16 bullets). Create `docs/KNOWN_GAPS.md`:

```markdown
# TEKGUYZ CRM — Known Gaps

Relocated from CLAUDE.md on 2026-08-14. It is a register of deliberately
deferred work, not an instruction set, and it was the documented cause of both
CLAUDE.md compression passes.

## How to maintain this file

- Anything intentionally deferred gets a bullet here, so it is never silently
  assumed complete in a later session.
- Open items are ⬜, one to two sentences, with a date and a pointer to the full
  story in `docs/ADDENDA_LOG.md`.
- The moment an item is fully resolved, move its line to
  `docs/ADDENDA_LOG.md` § "Known Gaps — Resolved Items Archive" in that same
  session. Do not leave resolved items here "to clean up later".
- A ✅ shown beside a ⬜ means partially resolved with real open scope — the ✅
  half is context for why the ⬜ half is scoped as it is.
- An item with no date is stale. Re-triage it before relying on it.

## Open items

<paste the 16 bullets verbatim here>
```

Replace the removed CLAUDE.md section with exactly:

```markdown
## Known Gaps
Deliberately deferred work lives in `docs/KNOWN_GAPS.md`, including the rules
for maintaining it. Read it before assuming any limitation is already handled.
```

- [ ] **Step 3: Fix the file-size rule**

Replace the whole `### File Bloat Prevention` section (CLAUDE.md line 18–19) with:

```markdown
### File Size
Split files by responsibility, not by line count. A file should do one thing;
when it starts doing two, split it into a sibling at the same directory level
(the customer profile view is the reference shape: layout shell, brief,
timeline, note-capture, each its own module).

**Around 200 lines is a smell worth a second look, not a wall.** Never split a
cohesive unit purely to get under a number — that is how this project produced
its worst bug class. A form split across siblings hides its own field set, so no
single file shows it, and five `leads` columns were silently NULLed across two
incidents as a direct result (see Form/Action Field Parity below). A 240-line
file with one clear job beats two 120-line files that must be read together.
```

- [ ] **Step 4: Fix the contradiction in the update rule**

In the `## Session & Verification Discipline` bullet beginning "**Update CLAUDE.md proactively**", replace this clause:

```
When unsure whether something is durable enough, log it — a stale entry is easier to prune than a decision that only existed in a cleared chat.
```

with:

```
When unsure whether something is durable enough, leave it out — this file has needed two emergency compressions, and "log it when unsure" is what filled it. If it turns out to matter, it will come up again and can be logged then.
```

- [ ] **Step 5: Fix the dead tool names**

Replace the `preview_click` bullet entirely with:

```markdown
- **A scripted click on a state-changing button can report success while doing nothing.** Cross-check any such result against the network tab or the DOM before trusting it. The current Browser pane tools are `computer` (real pointer and keyboard), `read_page`, `read_network_requests`, and `javascript_tool`; a direct `button.click()` via `javascript_tool` is the reliable fallback when a synthetic click no-ops.
```

- [ ] **Step 6: Rewrite build discipline**

Replace the whole `## Build discipline` section with:

```markdown
## Build discipline
Finish and verify one unit before starting the next. Never generate ahead of
what has been verified. "Verified" means the thing was actually run — dev server,
test, or browser — not that it compiled. If a unit includes a migration, apply it
to the real Supabase project and confirm it before continuing.
```

- [ ] **Step 7: Trim the Reference Index**

Replace CLAUDE.md lines 3–12 (the `## Reference Index` heading and all four paragraphs) with:

```markdown
## Reference Index

- **This file:** permanent rules only — the design system, operational rules, the multi-tenant security model, post-launch initiative status, and the standing disciplines. Edit it only when a permanent rule or pattern changes.
- **`docs/SCHEMA_REFERENCE.md`:** the live database schema — every table, RLS policy with its paired `WITH CHECK`, `SECURITY DEFINER` RPC, and index. Read before any migration, RLS, or RPC work.
- **`docs/ADDENDA_LOG.md`:** dated build history and the full story behind past decisions. New addenda go here, not in this file.
- **`docs/KNOWN_GAPS.md`:** deliberately deferred work.
```

Move the compression-history paragraph verbatim into `docs/ADDENDA_LOG.md` under a heading `## CLAUDE.md compression history`, appending one line: `2026-08-14: § 2 roadmap and Known Gaps relocated out; file-size cap softened to a smell; "log it when unsure" reversed. 133 → ~60 lines.`

- [ ] **Step 8: Verify nothing else changed**

Run: `git diff --stat`
Expected: exactly three files — `CLAUDE.md`, `docs/ADDENDA_LOG.md`, `docs/KNOWN_GAPS.md`.

Run: `wc -l CLAUDE.md`
Expected: roughly 60 lines (55–70 acceptable).

Confirm by reading `CLAUDE.md` that these are all still present and unedited: the Multi-Tenant Security Model, Form/Action Field Parity, the "a classifier verdict ROUTES a lead, it never hides one" rule, the Supabase MCP tool-access rule, and the three browser gotchas (`document.visibilityState`, Radix focus return, synthetic `mouseover`).

- [ ] **Step 9: Commit**

```bash
git add CLAUDE.md docs/ADDENDA_LOG.md docs/KNOWN_GAPS.md
git commit -m "Restructure CLAUDE.md: soften file-size rule, relocate closed roadmap and Known Gaps"
```

---

## Task 1: Test runner

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/smoke.test.ts` (deleted at the end of this task)
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` runs Vitest once and exits; `npm run test:watch` watches. Test files are `src/**/*.test.{ts,tsx}`. `@/` resolves to `src/`. `@testing-library/jest-dom` matchers are registered globally. Vitest globals are **off** — every test file imports `describe`, `it`, `expect`, `vi` explicitly from `vitest`.

- [ ] **Step 1: Install**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Write the config**

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    globals: false,
    css: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Add the scripts**

In `package.json`, inside `"scripts"`, after `"lint": "eslint"`, add:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Write a failing smoke test**

Create `src/test/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("test harness", () => {
  it("resolves the @ alias and merges classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("has jest-dom matchers registered", () => {
    const el = document.createElement("div");
    el.textContent = "hello";
    document.body.appendChild(el);
    expect(el).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: PASS, 2 tests. If the `@` alias fails, the alias block in `vitest.config.ts` is wrong. If `toBeInTheDocument` is not a function, `setupFiles` is not being picked up.

- [ ] **Step 6: Delete the smoke test**

```bash
rm src/test/smoke.test.ts
```

It proved the harness works. Keeping it is maintenance cost for a tautology.

- [ ] **Step 7: Confirm lint still passes**

Run: `npm run lint`
Expected: clean. If ESLint complains about `vitest.config.ts`, add it to the ignore list in the existing ESLint config rather than weakening a rule.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts src/test/setup.ts package.json package-lock.json
git commit -m "Add Vitest + React Testing Library"
```

---

## Task 2: v2 tokens and fonts

No unit test exists for this task and none should be written — asserting a CSS custom property's string value in jsdom proves the string was typed twice, not that the design is right. Verification is the compiler, the build, and the browser.

**Files:**
- Modify: `src/app/globals.css` (full replacement)
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces, for every later task: Tailwind utilities `bg-canvas-soft`, `bg-canvas-pure`, `text-ink-main`, `text-ink-muted`, `border-hairline`, `bg-accent`, `text-accent`, `text-accent-fg`, `bg-danger`, `text-danger`, `text-danger-fg`, `border-cold`, `text-cold`, the six `bg-pill-<name>-bg` / `text-pill-<name>-fg` pairs, radius `rounded-xs|sm|md|lg|xl`, shadows `shadow-elevation-1|2`, and type roles `text-display|h1|h2|title|body-md|body-sm|label|caption`. Also produces a usable `.light` class (not just `.dark`), required by Task 4's two-pane page.

- [ ] **Step 1: Replace `src/app/globals.css` in full**

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme {
  --font-sans: var(--font-inter);
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --color-canvas-soft: var(--canvas-soft);
  --color-canvas-pure: var(--canvas-pure);
  --color-ink-main: var(--ink-main);
  --color-ink-muted: var(--ink-muted);
  --color-hairline: var(--hairline);
  --color-accent: var(--accent);
  --color-accent-fg: var(--accent-fg);
  --color-danger: var(--danger);
  --color-danger-fg: var(--danger-fg);
  --color-cold: var(--cold);

  --color-pill-purple-bg: var(--pill-purple-bg);
  --color-pill-purple-fg: var(--pill-purple-fg);
  --color-pill-pink-bg: var(--pill-pink-bg);
  --color-pill-pink-fg: var(--pill-pink-fg);
  --color-pill-orange-bg: var(--pill-orange-bg);
  --color-pill-orange-fg: var(--pill-orange-fg);
  --color-pill-teal-bg: var(--pill-teal-bg);
  --color-pill-teal-fg: var(--pill-teal-fg);
  --color-pill-green-bg: var(--pill-green-bg);
  --color-pill-green-fg: var(--pill-green-fg);
  --color-pill-sky-bg: var(--pill-sky-bg);
  --color-pill-sky-fg: var(--pill-sky-fg);

  /* Border radius (DESIGN.md v2). Overrides Tailwind's stock scale under the
     same utility names — rounded-md here is 6px. Never reason from Tailwind
     radius defaults in this codebase. */
  --radius-xs: 3px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 10px;

  /* Type scale (DESIGN.md v2). These are ADDITIONAL names, not overrides —
     Tailwind's own text-xs / text-sm / text-base keep their stock meanings.
     Size, line-height, weight and tracking are all baked in, so one utility
     class is complete and the roles cannot drift apart at call sites. */
  --text-display: 22px;
  --text-display--line-height: 1.2;
  --text-display--font-weight: 700;
  --text-display--letter-spacing: -0.015em;

  --text-h1: 18px;
  --text-h1--line-height: 1.3;
  --text-h1--font-weight: 650;
  --text-h1--letter-spacing: -0.01em;

  --text-h2: 15px;
  --text-h2--line-height: 1.35;
  --text-h2--font-weight: 600;
  --text-h2--letter-spacing: -0.01em;

  --text-title: 14px;
  --text-title--line-height: 1.4;
  --text-title--font-weight: 600;

  --text-body-md: 13px;
  --text-body-md--line-height: 1.5;
  --text-body-md--font-weight: 400;

  --text-body-sm: 12px;
  --text-body-sm--line-height: 1.5;
  --text-body-sm--font-weight: 400;

  --text-label: 11px;
  --text-label--line-height: 1.4;
  --text-label--font-weight: 550;
  --text-label--letter-spacing: 0.02em;

  --text-caption: 11px;
  --text-caption--line-height: 1.45;
  --text-caption--font-weight: 400;

  /* Elevation (DESIGN.md v2). Level 0 is the absence of a shadow and is the
     default for buttons, cards, inputs and table rows — it has no token.
     Level 1 is dropdowns and popovers only. Level 2 is modals and the command
     palette only. Dark mode runs ~3x the light alpha at each stop, because
     black-on-near-black is far weaker than black-on-white at equal alpha.
     Keep that ratio if these are ever retuned. */
  --shadow-elevation-1: var(--elevation-1);
  --shadow-elevation-2: var(--elevation-2);
}

@layer base {
  /* Hue 260 (cool neutral) throughout, replacing v1's warm 60 / 240 mix.
     `.light` exists as an explicit class, not just as :root, so a subtree can
     be forced to light — the kitchen-sink page renders both themes side by
     side on one screen and needs that. */
  :root,
  .light {
    --canvas-soft: oklch(0.98 0.002 260);
    --canvas-pure: oklch(1 0 0);
    --ink-main: oklch(0.15 0.004 260);
    --ink-muted: oklch(0.52 0.006 260);
    --hairline: oklch(0.9 0.003 260);

    /* PLACEHOLDER — NOT SAMPLED. DESIGN.md v2 ships this value so components
       have something to render against; no Twenty CRM reference screenshot was
       ever provided, so it has never been visually confirmed. Do not describe
       this as final. Replace it only by sampling a real reference. */
    --accent: oklch(0.48 0.16 260);
    --accent-fg: oklch(0.99 0 0);

    /* --danger / --danger-fg and --accent-fg are additions beyond DESIGN.md v2,
       approved 2026-08-14. v2 defines no destructive colour, but this app
       archives, deletes and revokes, and the pill palette may never be used for
       a button. The -fg pairs exist because one accent value cannot be both a
       background and readable text across two themes. */
    --danger: oklch(0.52 0.19 25);
    --danger-fg: oklch(0.99 0 0);

    --cold: oklch(0.68 0.004 260);

    /* Decorative pills: same six hues as v1, chroma x0.78 (a ~22% cut).
       Lightness is untouched in every pair, so existing fg/bg contrast is
       preserved and only saturation drops. DESIGN.md v2 specifies the cut for
       light mode only; the same ratio is applied to dark below so the two
       themes read as one palette. */
    --pill-purple-bg: oklch(0.94 0.031 300);
    --pill-purple-fg: oklch(0.45 0.14 300);
    --pill-pink-bg: oklch(0.94 0.035 350);
    --pill-pink-fg: oklch(0.5 0.148 350);
    --pill-orange-bg: oklch(0.94 0.039 55);
    --pill-orange-fg: oklch(0.48 0.133 45);
    --pill-teal-bg: oklch(0.94 0.031 195);
    --pill-teal-fg: oklch(0.45 0.078 195);
    --pill-green-bg: oklch(0.94 0.039 145);
    --pill-green-fg: oklch(0.45 0.109 145);
    --pill-sky-bg: oklch(0.94 0.023 235);
    --pill-sky-fg: oklch(0.48 0.094 235);

    --elevation-1: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.05);
    --elevation-2: 0 2px 6px rgba(0, 0, 0, 0.05), 0 8px 24px rgba(0, 0, 0, 0.06),
      0 20px 44px rgba(0, 0, 0, 0.06);
  }

  .dark {
    --canvas-soft: oklch(0.14 0.004 260);
    --canvas-pure: oklch(0.18 0.004 260);
    --ink-main: oklch(0.97 0 0);
    --ink-muted: oklch(0.66 0.008 260);
    /* 10-point lightness gap over canvas-pure (0.28 vs 0.18), matching light
       mode's 10-point gap (0.90 vs 1.00). v1 needed a one-off brightening fix
       here because its two themes had different gaps; v2's published numbers
       already have parity, so keep them in step if either is retuned. */
    --hairline: oklch(0.28 0.005 260);

    /* PLACEHOLDER — NOT SAMPLED. See the light-mode note above. */
    --accent: oklch(0.62 0.15 260);
    /* Dark accent is light (L 0.62), so its foreground flips to near-black.
       Near-white on it would fail contrast. */
    --accent-fg: oklch(0.16 0.004 260);

    --danger: oklch(0.65 0.18 25);
    --danger-fg: oklch(0.16 0.004 25);

    --cold: oklch(0.42 0.006 260);

    --pill-purple-bg: oklch(0.3 0.062 300);
    --pill-purple-fg: oklch(0.86 0.047 300);
    --pill-pink-bg: oklch(0.3 0.07 350);
    --pill-pink-fg: oklch(0.87 0.055 350);
    --pill-orange-bg: oklch(0.3 0.07 55);
    --pill-orange-fg: oklch(0.85 0.055 55);
    --pill-teal-bg: oklch(0.3 0.047 195);
    --pill-teal-fg: oklch(0.85 0.039 195);
    --pill-green-bg: oklch(0.3 0.062 145);
    --pill-green-fg: oklch(0.85 0.047 145);
    --pill-sky-bg: oklch(0.3 0.039 235);
    --pill-sky-fg: oklch(0.85 0.039 235);

    --elevation-1: 0 1px 2px rgba(0, 0, 0, 0.14), 0 4px 12px rgba(0, 0, 0, 0.18);
    --elevation-2: 0 2px 6px rgba(0, 0, 0, 0.16), 0 8px 24px rgba(0, 0, 0, 0.2),
      0 20px 44px rgba(0, 0, 0, 0.22);
  }

  body {
    background-color: var(--canvas-soft);
    color: var(--ink-main);
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: 700;
    /* v2 tracking. v1 used -0.04em, which read as marketing display type; this
       should read as dense utility. A text-* role utility still overrides both
       properties, because utilities sit in a later cascade layer. */
    letter-spacing: -0.015em;
  }

  /* Accessibility floor: every interactive element gets a visible focus ring.
     Keyboard only — :focus-visible, so a mouse click does not paint a ring. */
  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  /* Fields get a ring drawn on the border instead of an offset outline, so the
     focus signal reads as part of the field. This is a 1px ring, NOT an
     elevation shadow — v2 fields are Level 0 and stay flat when focused.
     The :not() must remain a SINGLE :not() with a comma-separated list.
     Chaining :not(a):not(b) silently fails to compile under this project's
     Lightning CSS / Turbopack pipeline — no error, just no focus styling. */
  input:not([type="checkbox"], [type="radio"]):focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

- [ ] **Step 2: Swap the font in `src/app/layout.tsx`**

Replace the import line:

```ts
import { Geist, Geist_Mono } from "next/font/google";
```

with:

```ts
import { Inter } from "next/font/google";
```

Replace both font constants:

```ts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

with:

```ts
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
```

Replace the body className:

```tsx
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
```

with:

```tsx
        className={`${inter.variable} antialiased`}
```

Geist Mono is dropped rather than re-pointed: `font-mono` had zero consumers anywhere in `src/`, so it was a font download for nothing. `--font-mono` now resolves to a system stack, so a future code block still renders.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. A failure here means a leftover `geistSans` / `geistMono` reference.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: clean. A CSS parse error here means a typo in the `@theme` block — Tailwind v4's `--text-*--font-weight` modifier syntax is exact.

- [ ] **Step 5: Confirm the focus rule actually compiled**

This is the one CSS gotcha that fails silently, so it gets checked directly rather than assumed.

Run: `grep -c "focus-visible" .next/static/css/*.css`
Expected: a non-zero count. Zero means the `:not()` selector was dropped at compile time — re-check that it is a single `:not()` with a comma list.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "Replace Notion High-Voltage tokens with Design System v2 Structural Neutral"
```

---

## Task 3: Icon library swap

**Files:**
- Modify: `package.json`
- Modify: all 19 files importing `lucide-react` (table below)

**Interfaces:**
- Produces: `@tabler/icons-react` as the app's only icon library. Icon components accept `className` (for `size-*`) and a numeric `stroke` prop.

- [ ] **Step 1: Install Tabler**

```bash
npm install @tabler/icons-react
```

- [ ] **Step 2: Rename icons, file by file**

For each file: change the import line, then change every JSX usage of that identifier. Do **not** touch className, props, layout, or logic — this task changes identifiers only.

| File | lucide → tabler |
|---|---|
| `src/components/command/CommandBar.tsx` | `Search` → `IconSearch` |
| `src/components/contacts/ContactCard.tsx` | `Phone` → `IconPhone`, `MessageSquare` → `IconMessage`, `Mail` → `IconMail`, `MapPin` → `IconMapPin` |
| `src/components/help/HelpDrawer.tsx` | `Search` → `IconSearch` |
| `src/components/help/HelpTooltip.tsx` | `HelpCircle` → `IconHelpCircle` |
| `src/components/help/HelpTrigger.tsx` | `HelpCircle` → `IconHelpCircle` |
| `src/components/import/CsvUploadDropzone.tsx` | `UploadCloud` → `IconCloudUpload` |
| `src/components/leads/CreateLeadModal.tsx` | `Plus` → `IconPlus` |
| `src/components/leads/profile/NoteCaptureForm.tsx` | `Mic` → `IconMicrophone`, `Square` → `IconSquare` |
| `src/components/leads/profile/ProfileSheet.tsx` | `X` → `IconX` |
| `src/components/pipeline/FocusListCard.tsx` | `Star` → `IconStar` |
| `src/components/pipeline/KanbanCard.tsx` | `Star` → `IconStar` |
| `src/components/settings/CopyInviteLinkButton.tsx` | `Copy` → `IconCopy`, `Check` → `IconCheck` |
| `src/components/shell/Header.tsx` | `Search` → `IconSearch`, `LogOut` → `IconLogout` |
| `src/components/shell/Sidebar.tsx` | `LayoutGrid` → `IconLayoutGrid`, `KanbanSquare` → `IconLayoutKanban`, `Users` → `IconUsers`, `Upload` → `IconUpload`, `Settings` → `IconSettings` |
| `src/components/shell/ThemeToggle.tsx` | `Sun` → `IconSun`, `Moon` → `IconMoon`, `Monitor` → `IconDeviceDesktop` |
| `src/components/ui/CopyButton.tsx` | `Copy` → `IconCopy`, `Check` → `IconCheck` |
| `src/components/ui/dialog.tsx` | `X` → `IconX` |
| `src/components/ui/Modal.tsx` | `X` → `IconX` |
| `src/components/ui/PasswordInput.tsx` | `Eye` → `IconEye`, `EyeOff` → `IconEyeOff` |

Worked example — `src/components/ui/Modal.tsx`:

```diff
-import { X } from "lucide-react";
+import { IconX } from "@tabler/icons-react";
```
```diff
-          <X className="size-4" />
+          <IconX className="size-4" />
```

Note `Sidebar.tsx` also uses its icons as values in the `NAV_ITEMS` array (`icon: LayoutGrid`), not only as JSX tags. Rename those too.

- [ ] **Step 3: Remove lucide**

```bash
npm uninstall lucide-react
```

- [ ] **Step 4: Prove the sweep is complete**

Run: `npx tsc --noEmit`
Expected: clean. This is the completeness check — any icon left un-renamed is now an undefined identifier and fails here. Do not proceed on a failure; fix the named file.

Run: `grep -rn "lucide-react" src/ package.json`
Expected: no matches.

- [ ] **Step 5: Confirm nothing else moved**

Run: `git diff -- src/ | grep "^[-+]" | grep -v "^[-+][-+]" | grep -viE "lucide|@tabler|Icon[A-Z]|<[A-Z]|icon:"`
Expected: no output. Any line here is an edit beyond the identifier rename — revert it.

- [ ] **Step 6: Build and lint**

Run: `npm run build`
Expected: clean.

Run: `npm run lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Swap lucide-react for @tabler/icons-react across all 19 call sites"
```

---

## Task 4: Kitchen-sink route and token swatches

Built before the primitives so every later task has a place to render itself and be looked at.

**Files:**
- Create: `src/app/(dev)/design/page.tsx`
- Create: `src/app/(dev)/design/ThemePane.tsx`
- Create: `src/app/(dev)/design/sections/TokensSection.tsx`
- Create: `.claude/launch.json` (only if it does not already exist)

**Interfaces:**
- Produces: `ThemePane`, which every later task's section is added into; and the convention that each section is a default-exported component in `src/app/(dev)/design/sections/`.

- [ ] **Step 1: Write the page**

Create `src/app/(dev)/design/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { ThemePane } from "./ThemePane";

// Dev-only reference surface for Design System v2. Lives outside the (app)
// route group deliberately, so it inherits no AppShell chrome and no view in
// the real app is affected by it.
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen bg-canvas-soft p-6 text-ink-main">
      <header className="mb-6">
        <h1 className="text-display">Design System v2 — Structural Neutral</h1>
        <p className="text-body-md mt-1 text-ink-muted">
          Every primitive, every state, both themes. Dev-only route.
        </p>
        <p className="text-caption mt-2 text-ink-muted">
          --accent is an unsampled placeholder. No reference screenshot was ever
          provided; do not treat its value as confirmed.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <ThemePane theme="light" />
        <ThemePane theme="dark" />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Write the theme pane**

Create `src/app/(dev)/design/ThemePane.tsx`:

```tsx
import { TokensSection } from "./sections/TokensSection";

// Forces an explicit theme on its subtree rather than inheriting the ambient
// one, so both themes are visible in a single screenshot without toggling.
// This works because .light and .dark are plain class selectors that redeclare
// the custom properties (see globals.css) — a nested wrapper re-themes its own
// subtree. next-themes still drives the ambient theme on <html> as normal.
export function ThemePane({ theme }: { theme: "light" | "dark" }) {
  return (
    <section className={theme}>
      <div className="rounded-lg border border-hairline bg-canvas-soft p-4">
        <h2 className="text-h1 mb-4 text-ink-main capitalize">{theme}</h2>
        <div className="flex flex-col gap-6">
          <TokensSection />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Write the token swatches**

Create `src/app/(dev)/design/sections/TokensSection.tsx`:

```tsx
const SURFACES = [
  { name: "canvas-soft", className: "bg-canvas-soft" },
  { name: "canvas-pure", className: "bg-canvas-pure" },
  { name: "hairline", className: "bg-hairline" },
  { name: "ink-muted", className: "bg-ink-muted" },
  { name: "ink-main", className: "bg-ink-main" },
  { name: "accent", className: "bg-accent" },
  { name: "danger", className: "bg-danger" },
  { name: "cold", className: "bg-cold" },
];

const PILLS = ["purple", "pink", "orange", "teal", "green", "sky"] as const;

const RADII = ["xs", "sm", "md", "lg", "xl"] as const;

const TYPE_ROLES = [
  "display",
  "h1",
  "h2",
  "title",
  "body-md",
  "body-sm",
  "label",
  "caption",
] as const;

export function TokensSection() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-h2">Tokens</h3>

      <div className="flex flex-wrap gap-2">
        {SURFACES.map(({ name, className }) => (
          <div key={name} className="flex flex-col items-center gap-1">
            <div
              className={`size-12 rounded-sm border border-hairline ${className}`}
            />
            <span className="text-caption text-ink-muted">{name}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {PILLS.map((pill) => (
          <span
            key={pill}
            className={`text-label rounded-sm px-1.5 py-0.5 bg-pill-${pill}-bg text-pill-${pill}-fg`}
          >
            {pill}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {RADII.map((r) => (
          <div key={r} className="flex flex-col items-center gap-1">
            <div
              className={`size-12 border border-hairline bg-canvas-pure rounded-${r}`}
            />
            <span className="text-caption text-ink-muted">rounded-{r}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg bg-canvas-pure p-3 text-caption">
          Level 0 — no shadow
        </div>
        <div className="rounded-lg bg-canvas-pure p-3 text-caption shadow-elevation-1">
          Level 1 — popovers
        </div>
        <div className="rounded-lg bg-canvas-pure p-3 text-caption shadow-elevation-2">
          Level 2 — modals
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {TYPE_ROLES.map((role) => (
          <p key={role} className={`text-${role}`}>
            text-{role} — The quick brown fox jumps over the lazy dog
          </p>
        ))}
      </div>
    </div>
  );
}
```

Note on the dynamic class names above (`bg-pill-${pill}-bg`, `rounded-${r}`, `text-${role}`): Tailwind cannot see these at build time, so they are **not** generated. Fix this in the next step rather than leaving it — it is exactly the kind of silent no-op this page exists to catch.

- [ ] **Step 4: Replace the dynamic class names with static ones**

Rewrite the three dynamic maps to hold full literal class strings, so Tailwind's scanner finds them:

```tsx
const PILLS = [
  { name: "purple", className: "bg-pill-purple-bg text-pill-purple-fg" },
  { name: "pink", className: "bg-pill-pink-bg text-pill-pink-fg" },
  { name: "orange", className: "bg-pill-orange-bg text-pill-orange-fg" },
  { name: "teal", className: "bg-pill-teal-bg text-pill-teal-fg" },
  { name: "green", className: "bg-pill-green-bg text-pill-green-fg" },
  { name: "sky", className: "bg-pill-sky-bg text-pill-sky-fg" },
];

const RADII = [
  { name: "rounded-xs", className: "rounded-xs" },
  { name: "rounded-sm", className: "rounded-sm" },
  { name: "rounded-md", className: "rounded-md" },
  { name: "rounded-lg", className: "rounded-lg" },
  { name: "rounded-xl", className: "rounded-xl" },
];

const TYPE_ROLES = [
  { name: "text-display", className: "text-display" },
  { name: "text-h1", className: "text-h1" },
  { name: "text-h2", className: "text-h2" },
  { name: "text-title", className: "text-title" },
  { name: "text-body-md", className: "text-body-md" },
  { name: "text-body-sm", className: "text-body-sm" },
  { name: "text-label", className: "text-label" },
  { name: "text-caption", className: "text-caption" },
];
```

and consume `{className}` / `{name}` in the JSX instead of interpolating.

**This static-class rule applies to every section file in Tasks 5–11.** Never build a Tailwind class from a template literal.

- [ ] **Step 5: Make sure the dev server can be launched**

Check whether `.claude/launch.json` exists. If it does not, create it:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "tekguyz-crm",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 3000
    }
  ]
}
```

- [ ] **Step 6: Look at it**

Start the preview with `preview_start` using the `tekguyz-crm` config, then navigate to `/design`.

Verify by reading the page and taking a screenshot:
- Both panes render, and the left one is light while the right one is dark, **regardless of the ambient theme**. If both panes look the same, `.light` is missing from `globals.css` — go back to Task 2.
- All 8 surface swatches are distinguishable.
- All 6 pills render tinted, not grey. Grey means the dynamic-class problem from Step 3 was not fully fixed.
- The 5 radius squares get visibly rounder left to right.
- Level 0 has no shadow; Level 1 is subtle; Level 2 is stronger but still light.
- The 8 type roles step down in size, and `text-display` is clearly the largest.

- [ ] **Step 7: Confirm the route is dev-only**

Run: `npm run build`
Expected: clean, and `/design` must not appear as a prerendered static route in the build output. It calls `notFound()` in production.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(dev)" .claude/launch.json
git commit -m "Add dev-only design system kitchen-sink route with token swatches"
```

---

## Task 5: Button

**Files:**
- Create: `src/components/ui/Button.tsx`
- Test: `src/components/ui/Button.test.tsx`
- Create: `src/app/(dev)/design/sections/ButtonsSection.tsx`
- Modify: `src/app/(dev)/design/ThemePane.tsx`

**Interfaces:**
- Produces: `Button`, `type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"`, `type ButtonSize = "sm" | "md"`. Props: all native `<button>` props plus `variant?: ButtonVariant` (default `"secondary"`), `size?: ButtonSize` (default `"md"`), `loading?: boolean` (default `false`). `loading` implies `disabled`.
- Consumed by: Task 11 (`CopyButton` composes it) and the kitchen-sink page.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/Button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("defaults to the secondary variant and md size", () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveClass("border-hairline");
    expect(btn).toHaveClass("text-body-md");
  });

  it("renders the primary variant on the accent token", () => {
    render(<Button variant="primary">Save</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-accent", "text-accent-fg");
  });

  it("renders the danger variant on the danger token", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-danger", "text-danger-fg");
  });

  it("carries no elevation shadow in any variant", () => {
    const variants = ["primary", "secondary", "ghost", "danger"] as const;
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>x</Button>);
      const cls = screen.getByRole("button").className;
      expect(cls).not.toMatch(/shadow-elevation/);
      unmount();
    }
  });

  it("applies the sm size", () => {
    render(<Button size="sm">Save</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-body-sm");
  });

  it("disables when disabled", () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("disables and marks itself busy when loading", () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("is not busy when not loading", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
  });

  it("merges a caller className", () => {
    render(<Button className="w-full">Save</Button>);
    expect(screen.getByRole("button")).toHaveClass("w-full");
  });

  it("forwards native props", () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- Button`
Expected: FAIL — `Failed to resolve import "./Button"`.

- [ ] **Step 3: Implement**

Create `src/components/ui/Button.tsx`:

```tsx
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

// Design System v2: every variant is Level 0 — hairline border, no shadow.
// v1 gave buttons a Level-1 shadow; that is deliberately gone. The -fg tokens
// exist because --accent and --danger flip lightness between themes, so a
// fixed white foreground would fail contrast in dark mode.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-accent text-accent-fg hover:opacity-90",
  secondary: "border-hairline bg-canvas-pure text-ink-main hover:bg-canvas-soft",
  ghost:
    "border-transparent bg-transparent text-ink-muted hover:bg-canvas-soft hover:text-ink-main",
  danger: "border-transparent bg-danger text-danger-fg hover:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "text-body-sm h-7 gap-1.5 px-2",
  md: "text-body-md h-8 gap-2 px-3",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden
          className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
```

Note: `disabled ?? loading` means an explicit `disabled={false}` still wins for the attribute, while `loading` alone disables. The test covers both.

- [ ] **Step 4: Run the tests**

Run: `npm test -- Button`
Expected: PASS, 10 tests.

- [ ] **Step 5: Add it to the kitchen sink**

Create `src/app/(dev)/design/sections/ButtonsSection.tsx`:

```tsx
import { Button } from "@/components/ui/Button";

const VARIANTS = [
  { name: "primary", variant: "primary" as const },
  { name: "secondary", variant: "secondary" as const },
  { name: "ghost", variant: "ghost" as const },
  { name: "danger", variant: "danger" as const },
];

export function ButtonsSection() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-h2">Button</h3>
      {VARIANTS.map(({ name, variant }) => (
        <div key={name} className="flex flex-wrap items-center gap-2">
          <span className="text-label w-20 text-ink-muted">{name}</span>
          <Button variant={variant} size="sm">
            Small
          </Button>
          <Button variant={variant}>Default</Button>
          <Button variant={variant} disabled>
            Disabled
          </Button>
          <Button variant={variant} loading>
            Loading
          </Button>
        </div>
      ))}
    </div>
  );
}
```

In `src/app/(dev)/design/ThemePane.tsx`, import `ButtonsSection` and render it directly after `<TokensSection />`.

- [ ] **Step 6: Look at it**

Reload `/design`. Verify in **both** panes:
- Four variant rows, four states each, none carrying a shadow.
- `primary` text is readable on the accent in light **and** dark. If dark-mode primary text is hard to read, `--accent-fg` is wrong — go back to Task 2, do not patch the Button.
- Disabled buttons are visibly faded and do not respond to hover.
- The loading spinner turns.
- Tab to a button and confirm a visible accent focus ring.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/Button.tsx src/components/ui/Button.test.tsx "src/app/(dev)"
git commit -m "Add Button primitive"
```

---

## Task 6: Input and Textarea

**Files:**
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Textarea.tsx`
- Test: `src/components/ui/Input.test.tsx`
- Test: `src/components/ui/Textarea.test.tsx`
- Create: `src/app/(dev)/design/sections/FormsSection.tsx`
- Modify: `src/app/(dev)/design/ThemePane.tsx`

**Interfaces:**
- Produces: `Input` and `Textarea`. Both take all native props for their element plus `label?: string`, `hint?: string`, `error?: string`. Both generate an id via `useId` when the caller supplies none, wire `label`'s `htmlFor` to it, set `aria-invalid` when `error` is present, and point `aria-describedby` at the error message if there is one, otherwise at the hint. `error` takes precedence — only one message renders.
- Consumed by: Task 7 (`Select` mirrors the contract), Task 11 (`PasswordInput` composes `Input`).

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/Input.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("associates a label with the field", () => {
    render(<Input label="Company" />);
    expect(screen.getByLabelText("Company")).toBeInTheDocument();
  });

  it("prefers a caller-supplied id over the generated one", () => {
    render(<Input id="company-field" label="Company" />);
    expect(screen.getByLabelText("Company")).toHaveAttribute("id", "company-field");
  });

  it("renders without a label", () => {
    render(<Input placeholder="Search" />);
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
  });

  it("marks itself invalid and links the error message", () => {
    render(<Input label="Email" error="Not a valid email" />);
    const field = screen.getByLabelText("Email");
    expect(field).toHaveAttribute("aria-invalid", "true");
    const describedBy = field.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "Not a valid email",
    );
  });

  it("links the hint when there is no error", () => {
    render(<Input label="Email" hint="We never share this" />);
    const field = screen.getByLabelText("Email");
    expect(field).not.toHaveAttribute("aria-invalid");
    const describedBy = field.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "We never share this",
    );
  });

  it("shows only the error when both error and hint are given", () => {
    render(<Input label="Email" hint="We never share this" error="Required" />);
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.queryByText("We never share this")).not.toBeInTheDocument();
  });

  it("switches the border to the danger token on error", () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByLabelText("Email")).toHaveClass("border-danger");
  });

  it("uses the hairline border when valid", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).toHaveClass("border-hairline");
  });

  it("forwards native props", () => {
    render(<Input label="Email" type="email" required />);
    const field = screen.getByLabelText("Email");
    expect(field).toHaveAttribute("type", "email");
    expect(field).toBeRequired();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- Input`
Expected: FAIL — `Failed to resolve import "./Input"`.

- [ ] **Step 3: Implement Input**

Create `src/components/ui/Input.tsx`:

```tsx
import { useId } from "react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

// Design System v2: fields are Level 0 — hairline border, no shadow, 4px/8px
// padding. The focus treatment is a 1px accent ring drawn in globals.css, not
// an elevation shadow.
export function Input({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: ComponentProps<"input"> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;

  return (
    <div className="flex w-full flex-col gap-1">
      {label ? (
        <label htmlFor={fieldId} className="text-label text-ink-muted">
          {label}
        </label>
      ) : null}
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          "text-body-md w-full rounded-xs border bg-canvas-pure px-2 py-1 text-ink-main placeholder:text-ink-muted",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-danger" : "border-hairline",
          className,
        )}
        {...props}
      />
      {error || hint ? (
        <p
          id={messageId}
          className={cn("text-caption", error ? "text-danger" : "text-ink-muted")}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- Input`
Expected: PASS, 9 tests.

- [ ] **Step 5: Write the failing Textarea test**

Create `src/components/ui/Textarea.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("associates a label with the field", () => {
    render(<Textarea label="Notes" />);
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("marks itself invalid and links the error message", () => {
    render(<Textarea label="Notes" error="Too long" />);
    const field = screen.getByLabelText("Notes");
    expect(field).toHaveAttribute("aria-invalid", "true");
    const describedBy = field.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy!)).toHaveTextContent("Too long");
  });

  it("links the hint when there is no error", () => {
    render(<Textarea label="Notes" hint="Markdown supported" />);
    const field = screen.getByLabelText("Notes");
    expect(field).not.toHaveAttribute("aria-invalid");
    const describedBy = field.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "Markdown supported",
    );
  });

  it("forwards native props", () => {
    render(<Textarea label="Notes" rows={6} />);
    expect(screen.getByLabelText("Notes")).toHaveAttribute("rows", "6");
  });
});
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `npm test -- Textarea`
Expected: FAIL — `Failed to resolve import "./Textarea"`.

- [ ] **Step 7: Implement Textarea**

Create `src/components/ui/Textarea.tsx`. Same structure as `Input`, with `<textarea>` in place of `<input>` and `ComponentProps<"textarea">`. It is a sibling file rather than a prop on `Input` because the two elements have genuinely different native prop sets, and a discriminated union over `as` would be harder to read than the duplication.

```tsx
import { useId } from "react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

export function Textarea({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: ComponentProps<"textarea"> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;

  return (
    <div className="flex w-full flex-col gap-1">
      {label ? (
        <label htmlFor={fieldId} className="text-label text-ink-muted">
          {label}
        </label>
      ) : null}
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          "text-body-md w-full rounded-xs border bg-canvas-pure px-2 py-1 text-ink-main placeholder:text-ink-muted",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-danger" : "border-hairline",
          className,
        )}
        {...props}
      />
      {error || hint ? (
        <p
          id={messageId}
          className={cn("text-caption", error ? "text-danger" : "text-ink-muted")}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 8: Run the tests**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 9: Add to the kitchen sink**

Create `src/app/(dev)/design/sections/FormsSection.tsx` rendering, for both `Input` and `Textarea`: a plain field, a labelled field, a field with a hint, a field with an error, and a disabled field. Import it into `ThemePane.tsx` after `ButtonsSection`.

- [ ] **Step 10: Look at it**

Reload `/design`. Verify in both panes: labels sit above fields in `text-label`; error text and error border are the danger colour; disabled fields are faded; and clicking into a field shows a 1px accent ring with **no** drop shadow.

- [ ] **Step 11: Commit**

```bash
git add src/components/ui/Input.tsx src/components/ui/Input.test.tsx src/components/ui/Textarea.tsx src/components/ui/Textarea.test.tsx "src/app/(dev)"
git commit -m "Add Input and Textarea primitives"
```

---

## Task 7: Select

**Files:**
- Create: `src/components/ui/Select.tsx`
- Test: `src/components/ui/Select.test.tsx`
- Modify: `src/app/(dev)/design/sections/FormsSection.tsx`

**Interfaces:**
- Produces: `Select`. All native `<select>` props plus `label?: string`, `hint?: string`, `error?: string`. Same id, `aria-invalid` and `aria-describedby` contract as `Input`. Children are `<option>` elements supplied by the caller.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/Select.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select } from "./Select";

function options() {
  return (
    <>
      <option value="new">New</option>
      <option value="won">Won</option>
    </>
  );
}

describe("Select", () => {
  it("associates a label with the field", () => {
    render(<Select label="Status">{options()}</Select>);
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });

  it("renders its options", () => {
    render(<Select label="Status">{options()}</Select>);
    expect(screen.getByRole("option", { name: "Won" })).toBeInTheDocument();
  });

  it("marks itself invalid and links the error message", () => {
    render(
      <Select label="Status" error="Pick one">
        {options()}
      </Select>,
    );
    const field = screen.getByLabelText("Status");
    expect(field).toHaveAttribute("aria-invalid", "true");
    const describedBy = field.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy!)).toHaveTextContent("Pick one");
  });

  it("switches the border to the danger token on error", () => {
    render(
      <Select label="Status" error="Pick one">
        {options()}
      </Select>,
    );
    expect(screen.getByLabelText("Status")).toHaveClass("border-danger");
  });

  it("hides the chevron from assistive tech and from the pointer", () => {
    const { container } = render(<Select label="Status">{options()}</Select>);
    const chevron = container.querySelector("[aria-hidden='true']");
    expect(chevron).toBeTruthy();
    expect(chevron).toHaveClass("pointer-events-none");
  });

  it("forwards native props", () => {
    render(
      <Select label="Status" defaultValue="won" required>
        {options()}
      </Select>,
    );
    const field = screen.getByLabelText("Status");
    expect(field).toBeRequired();
    expect(field).toHaveValue("won");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- Select`
Expected: FAIL — `Failed to resolve import "./Select"`.

- [ ] **Step 3: Implement**

Create `src/components/ui/Select.tsx`:

```tsx
import { useId } from "react";
import type { ComponentProps } from "react";
import { IconChevronDown } from "@tabler/icons-react";

import { cn } from "@/lib/utils/cn";

// Wraps a native <select> rather than a custom listbox: seven existing call
// sites already use native selects, native gives correct mobile and keyboard
// behaviour for free, and v2 has no visual requirement a native control cannot
// meet. appearance-none removes the platform arrow so the Tabler chevron can
// sit in its place.
export function Select({
  label,
  hint,
  error,
  id,
  className,
  children,
  ...props
}: ComponentProps<"select"> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;

  return (
    <div className="flex w-full flex-col gap-1">
      {label ? (
        <label htmlFor={fieldId} className="text-label text-ink-muted">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            "text-body-md w-full appearance-none rounded-xs border bg-canvas-pure py-1 pr-7 pl-2 text-ink-main",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-danger" : "border-hairline",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <IconChevronDown
          aria-hidden="true"
          stroke={1.75}
          className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-ink-muted"
        />
      </div>
      {error || hint ? (
        <p
          id={messageId}
          className={cn("text-caption", error ? "text-danger" : "text-ink-muted")}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- Select`
Expected: PASS, 6 tests.

- [ ] **Step 5: Add to the kitchen sink**

In `FormsSection.tsx`, add a `Select` in each of: default, with hint, with error, and disabled.

- [ ] **Step 6: Look at it**

Reload `/design`. Verify in both panes: the chevron sits inside the right edge and does not overlap the value text; clicking anywhere on the control (including on the chevron) opens the native menu; the focus ring appears on keyboard focus.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/Select.tsx src/components/ui/Select.test.tsx "src/app/(dev)"
git commit -m "Add Select primitive"
```

---

## Task 8: Card and Badge

These ship together because they implement one business rule between them: the Going Cold SLA treatment is a dashed `--cold` card border **and** a desaturated status badge. Splitting them would let one half land without the other.

**Files:**
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Badge.tsx`
- Test: `src/components/ui/Card.test.tsx`
- Test: `src/components/ui/Badge.test.tsx`
- Create: `src/app/(dev)/design/sections/SurfacesSection.tsx`
- Modify: `src/app/(dev)/design/ThemePane.tsx`

**Interfaces:**
- Produces: `Card` — all native `<div>` props plus `cold?: boolean` (default `false`). When `cold`, the border becomes `border-dashed border-cold` and `data-cold="true"` is set. And `Badge` — `tone?: BadgeTone` (default `"neutral"`), `dot?: boolean` (default `false`), plus native `<span>` props, where `type BadgeTone = "neutral" | "purple" | "pink" | "orange" | "teal" | "green" | "sky" | "cold"`.

- [ ] **Step 1: Write the failing Card test**

Create `src/components/ui/Card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("is a Level 0 surface by default: hairline border, no shadow", () => {
    render(<Card>Body</Card>);
    const card = screen.getByText("Body");
    expect(card).toHaveClass("border-hairline");
    expect(card.className).not.toMatch(/shadow-elevation/);
  });

  it("is not marked cold by default", () => {
    render(<Card>Body</Card>);
    expect(screen.getByText("Body")).not.toHaveAttribute("data-cold");
  });

  it("switches to a dashed cold border when overdue", () => {
    render(<Card cold>Body</Card>);
    const card = screen.getByText("Body");
    expect(card).toHaveClass("border-dashed", "border-cold");
    expect(card).not.toHaveClass("border-hairline");
  });

  it("exposes the cold state as a data attribute", () => {
    render(<Card cold>Body</Card>);
    expect(screen.getByText("Body")).toHaveAttribute("data-cold", "true");
  });

  it("merges a caller className", () => {
    render(<Card className="w-64">Body</Card>);
    expect(screen.getByText("Body")).toHaveClass("w-64");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- Card`
Expected: FAIL — `Failed to resolve import "./Card"`.

- [ ] **Step 3: Implement Card**

Create `src/components/ui/Card.tsx`:

```tsx
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

// Level 0 surface: hairline border, no shadow, 16px padding (v1 used 24px).
//
// `cold` is the Going Cold SLA rule, carried over from v1 unchanged in
// behaviour and restyled in v2 tokens: when a lead's next_action_at is overdue
// its card border becomes a dashed --cold line and its status badge
// desaturates (see Badge's "cold" tone). The rule is a real business signal,
// not decoration — do not repurpose either for styling.
export function Card({
  cold = false,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { cold?: boolean }) {
  return (
    <div
      data-cold={cold ? "true" : undefined}
      className={cn(
        "rounded-lg border bg-canvas-pure p-4 text-ink-main",
        cold ? "border-dashed border-cold" : "border-hairline",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- Card`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the failing Badge test**

Create `src/components/ui/Badge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("defaults to the neutral tone", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toHaveClass("bg-canvas-soft", "text-ink-muted");
  });

  it("maps each decorative tone to its pill token pair", () => {
    const cases = [
      ["purple", "bg-pill-purple-bg", "text-pill-purple-fg"],
      ["pink", "bg-pill-pink-bg", "text-pill-pink-fg"],
      ["orange", "bg-pill-orange-bg", "text-pill-orange-fg"],
      ["teal", "bg-pill-teal-bg", "text-pill-teal-fg"],
      ["green", "bg-pill-green-bg", "text-pill-green-fg"],
      ["sky", "bg-pill-sky-bg", "text-pill-sky-fg"],
    ] as const;

    for (const [tone, bg, fg] of cases) {
      const { unmount } = render(<Badge tone={tone}>Tag</Badge>);
      expect(screen.getByText("Tag")).toHaveClass(bg, fg);
      unmount();
    }
  });

  it("uses the cold token for the overdue tone", () => {
    render(<Badge tone="cold">Overdue</Badge>);
    expect(screen.getByText("Overdue")).toHaveClass("text-cold");
  });

  it("renders no dot by default", () => {
    const { container } = render(<Badge>New</Badge>);
    expect(container.querySelector("[aria-hidden='true']")).toBeNull();
  });

  it("renders a decorative dot when asked", () => {
    const { container } = render(<Badge dot>New</Badge>);
    expect(container.querySelector("[aria-hidden='true']")).toBeTruthy();
  });

  it("merges a caller className", () => {
    render(<Badge className="uppercase">New</Badge>);
    expect(screen.getByText("New")).toHaveClass("uppercase");
  });
});
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `npm test -- Badge`
Expected: FAIL — `Failed to resolve import "./Badge"`.

- [ ] **Step 7: Implement Badge**

Create `src/components/ui/Badge.tsx`:

```tsx
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

export type BadgeTone =
  | "neutral"
  | "purple"
  | "pink"
  | "orange"
  | "teal"
  | "green"
  | "sky"
  | "cold";

// The decorative pill palette is for status badges and category dots ONLY —
// never layout borders, never primary buttons. "cold" is not decorative: it is
// the desaturated half of the Going Cold SLA rule (see Card's `cold` prop).
const TONES: Record<BadgeTone, string> = {
  neutral: "bg-canvas-soft text-ink-muted",
  purple: "bg-pill-purple-bg text-pill-purple-fg",
  pink: "bg-pill-pink-bg text-pill-pink-fg",
  orange: "bg-pill-orange-bg text-pill-orange-fg",
  teal: "bg-pill-teal-bg text-pill-teal-fg",
  green: "bg-pill-green-bg text-pill-green-fg",
  sky: "bg-pill-sky-bg text-pill-sky-fg",
  cold: "bg-canvas-soft text-cold",
};

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...props
}: ComponentProps<"span"> & { tone?: BadgeTone; dot?: boolean }) {
  return (
    <span
      className={cn(
        "text-label inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      ) : null}
      {children}
    </span>
  );
}
```

- [ ] **Step 8: Run the tests**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 9: Add to the kitchen sink**

Create `src/app/(dev)/design/sections/SurfacesSection.tsx` rendering: a normal `Card` with a `Badge` inside, a `cold` `Card` with a `tone="cold"` `Badge` inside labelled "Going Cold", and one row of all 8 badge tones with and without dots. Import it into `ThemePane.tsx` after `FormsSection`.

- [ ] **Step 10: Look at it**

Reload `/design`. Verify in both panes: the cold card's border is visibly **dashed** and greyer than the hairline; the cold badge is grey while the six decorative tones are tinted but clearly muted, not saturated; badge text is readable on its own background in both themes.

- [ ] **Step 11: Commit**

```bash
git add src/components/ui/Card.tsx src/components/ui/Card.test.tsx src/components/ui/Badge.tsx src/components/ui/Badge.test.tsx "src/app/(dev)"
git commit -m "Add Card and Badge primitives with the Going Cold SLA treatment"
```

---

## Task 9: NavItem

**Files:**
- Create: `src/components/ui/NavItem.tsx`
- Test: `src/components/ui/NavItem.test.tsx`
- Create: `src/app/(dev)/design/sections/NavSection.tsx`
- Modify: `src/app/(dev)/design/ThemePane.tsx`

**Interfaces:**
- Produces: `NavItem`. Props: `href: string`, `icon: NavIcon`, `active?: boolean` (default `false`), `children: ReactNode`, plus `className`. `NavIcon` is the structural type `ComponentType<{ className?: string; stroke?: number }>`, which every Tabler icon satisfies. Presentational only — it never reads the router; the caller decides `active`. Sets `aria-current="page"` when active.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/NavItem.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// next/link needs App Router context that jsdom does not provide. NavItem's
// contract is its markup and aria wiring, not Next's navigation, so the link is
// stubbed to a plain anchor.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { NavItem } = await import("./NavItem");

function StubIcon({ className }: { className?: string }) {
  return <svg data-testid="icon" className={className} />;
}

describe("NavItem", () => {
  it("renders a link to its href", () => {
    render(
      <NavItem href="/pipeline" icon={StubIcon}>
        Pipeline
      </NavItem>,
    );
    expect(screen.getByRole("link", { name: /Pipeline/ })).toHaveAttribute(
      "href",
      "/pipeline",
    );
  });

  it("renders its icon", () => {
    render(
      <NavItem href="/pipeline" icon={StubIcon}>
        Pipeline
      </NavItem>,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("is not marked current when inactive", () => {
    render(
      <NavItem href="/pipeline" icon={StubIcon}>
        Pipeline
      </NavItem>,
    );
    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
  });

  it("marks itself as the current page when active", () => {
    render(
      <NavItem href="/pipeline" icon={StubIcon} active>
        Pipeline
      </NavItem>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
  });

  it("uses the accent token only when active", () => {
    const { unmount } = render(
      <NavItem href="/pipeline" icon={StubIcon} active>
        Pipeline
      </NavItem>,
    );
    expect(screen.getByRole("link")).toHaveClass("text-accent");
    unmount();

    render(
      <NavItem href="/pipeline" icon={StubIcon}>
        Pipeline
      </NavItem>,
    );
    expect(screen.getByRole("link")).not.toHaveClass("text-accent");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- NavItem`
Expected: FAIL — cannot resolve `./NavItem`.

- [ ] **Step 3: Implement**

Create `src/components/ui/NavItem.tsx`:

```tsx
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

// Structural, so any Tabler icon satisfies it without importing Tabler's own
// type here.
export type NavIcon = ComponentType<{ className?: string; stroke?: number }>;

// Presentational only: it never reads the router. The caller owns `active`, so
// this stays testable and reusable outside a route context.
//
// `--accent` on the active item is one of its four sanctioned uses (primary
// CTAs, active nav links, focus rings, inline navigational links). Never use it
// decoratively.
export function NavItem({
  href,
  icon: Icon,
  active = false,
  className,
  children,
}: {
  href: string;
  icon: NavIcon;
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "text-body-md flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
        active
          ? "bg-canvas-soft font-medium text-accent"
          : "text-ink-muted hover:bg-canvas-soft hover:text-ink-main",
        className,
      )}
    >
      <Icon className="size-5" stroke={1.75} />
      {children}
    </Link>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- NavItem`
Expected: PASS, 5 tests.

- [ ] **Step 5: Add to the kitchen sink**

Create `src/app/(dev)/design/sections/NavSection.tsx` rendering a small vertical nav of four `NavItem`s using real Tabler icons (`IconLayoutGrid`, `IconLayoutKanban`, `IconUsers`, `IconSettings`), with exactly one marked `active`. Import it into `ThemePane.tsx` after `SurfacesSection`.

- [ ] **Step 6: Look at it**

Reload `/design`. Verify in both panes: the active item is accent-coloured on a soft background; inactive items are muted and lighten on hover (use a real pointer — a dispatched synthetic `mouseover` does not fire React's handlers); icons are 20px outline; keyboard focus shows the accent ring.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/NavItem.tsx src/components/ui/NavItem.test.tsx "src/app/(dev)"
git commit -m "Add NavItem primitive"
```

---

## Task 10: Table shell

**Files:**
- Create: `src/components/ui/TableRow.tsx`
- Test: `src/components/ui/TableRow.test.tsx`
- Create: `src/app/(dev)/design/sections/TableSection.tsx`
- Modify: `src/app/(dev)/design/ThemePane.tsx`

**Interfaces:**
- Produces, all from `TableRow.tsx`: `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell`, `TableHeaderCell`. Each takes its native element's props plus `className`. `TableRow` also takes `cold?: boolean`, matching `Card`'s treatment. No sorting, no selection, no virtualisation.

**Scope note for the implementer:** nothing in the app consumes this yet, and DESIGN.md v2 explicitly excludes Table View from this system's scope. It is built because the brief names it as a primitive. Keep it bare — do not add sorting, selection, resizing, or a data prop. Adding them would be building for a feature that does not exist.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/TableRow.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "./TableRow";

function renderTable(cold = false) {
  return render(
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow cold={cold}>
          <TableCell>Acme</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
}

describe("Table shell", () => {
  it("renders semantic table markup", () => {
    renderTable();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Acme" })).toBeInTheDocument();
  });

  it("separates rows with a hairline by default", () => {
    renderTable();
    const row = screen.getByRole("cell", { name: "Acme" }).closest("tr");
    expect(row).toHaveClass("border-hairline");
  });

  it("switches a row to the dashed cold border when overdue", () => {
    renderTable(true);
    const row = screen.getByRole("cell", { name: "Acme" }).closest("tr");
    expect(row).toHaveClass("border-dashed", "border-cold");
  });

  it("merges a caller className", () => {
    render(
      <Table className="mt-4">
        <TableBody>
          <TableRow>
            <TableCell>Acme</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("table")).toHaveClass("mt-4");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- TableRow`
Expected: FAIL — cannot resolve `./TableRow`.

- [ ] **Step 3: Implement**

Create `src/components/ui/TableRow.tsx`:

```tsx
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

// Bare structural shell only. No sorting, selection, resizing or data prop —
// nothing consumes this yet, and DESIGN.md v2 explicitly puts Table View out of
// scope. Build those with the feature, not ahead of it.
//
// The horizontal scroll wrapper is here rather than at call sites so a wide
// table can never make the page body scroll sideways.
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("text-body-sm w-full border-collapse", className)}
        {...props}
      />
    </div>
  );
}

export function TableHead({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("text-label text-ink-muted", className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={className} {...props} />;
}

// `cold` mirrors Card's Going Cold SLA treatment, so an overdue lead reads the
// same in a row as it does on a card.
export function TableRow({
  cold = false,
  className,
  ...props
}: ComponentProps<"tr"> & { cold?: boolean }) {
  return (
    <tr
      data-cold={cold ? "true" : undefined}
      className={cn(
        "border-b",
        cold ? "border-dashed border-cold" : "border-hairline",
        className,
      )}
      {...props}
    />
  );
}

export function TableHeaderCell({ className, ...props }: ComponentProps<"th">) {
  return (
    <th className={cn("px-3 py-2 text-left font-medium", className)} {...props} />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-3 py-2 text-ink-main", className)} {...props} />;
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 5: Add to the kitchen sink**

Create `src/app/(dev)/design/sections/TableSection.tsx` rendering a 3-column, 4-row table where one row is `cold`. Import it into `ThemePane.tsx` after `NavSection`.

- [ ] **Step 6: Look at it**

Reload `/design`. Verify in both panes: header cells are `text-label` and muted; row separators are hairline; the cold row's separator is dashed; the table does not make the page scroll sideways.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/TableRow.tsx src/components/ui/TableRow.test.tsx "src/app/(dev)"
git commit -m "Add bare Table shell primitive"
```

---

## Task 11: Restyle the existing primitives

No new tests here by decision (spec §5.5): a render-without-crash assertion on an existing component is maintenance cost without a real contract behind it. `npx tsc --noEmit`, the existing suites, and the browser are the gates.

**Files:**
- Modify: `src/components/ui/PasswordInput.tsx`
- Modify: `src/components/ui/CopyButton.tsx`
- Modify: `src/components/ui/Skeleton.tsx`
- Modify: `src/components/ui/Modal.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/alert-dialog.tsx`
- Modify: `src/components/ui/popover.tsx`
- Modify: `src/components/ui/sonner.tsx`
- Create: `src/app/(dev)/design/sections/OverlaysSection.tsx`
- Modify: `src/app/(dev)/design/ThemePane.tsx`

**Interfaces:**
- Consumes: `Button` (Task 5) and `Input` (Task 6).
- Produces: no API changes. Every one of these keeps its current props and behaviour; only classes change, plus two internal recompositions.

- [ ] **Step 1: Recompose PasswordInput onto Input**

Rewrite `src/components/ui/PasswordInput.tsx` so the field is an `Input` and the visibility toggle stays an absolutely-positioned button over it. Keep the exact same props (`name`, `placeholder`, `required`, `minLength`) and the same toggle behaviour and `aria-label` strings — call sites must not change.

```tsx
"use client";

import { useState } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

import { Input } from "@/components/ui/Input";

export function PasswordInput({
  name,
  placeholder,
  required,
  minLength,
}: {
  name: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="pr-9"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-2 -translate-y-1/2 text-ink-muted transition-colors hover:text-ink-main"
      >
        {visible ? (
          <IconEyeOff className="size-4" stroke={1.75} />
        ) : (
          <IconEye className="size-4" stroke={1.75} />
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Recompose CopyButton onto Button**

Rewrite the markup of `src/components/ui/CopyButton.tsx` to use `<Button variant="ghost" size="sm">`, keeping its `text` prop, its clipboard write, and the 1500ms "Copied" reset exactly as they are. Replace `Copy`/`Check` with `IconCopy`/`IconCheck`.

- [ ] **Step 3: Restyle Skeleton**

In `src/components/ui/Skeleton.tsx`, no class change is needed — `rounded-xs` and `bg-hairline/70` are already token-based and both now resolve to v2 values. Update only the leading comment where it refers to `shadow-elevation` as chrome that call sites add, so it reflects that Level 0 is now the default.

- [ ] **Step 4: Restyle Modal**

In `src/components/ui/Modal.tsx`, change the dialog className from `rounded-lg ... p-6 ... shadow-elevation-2` to v2 spacing: keep `rounded-lg`, keep `shadow-elevation-2` (modals are Level 2), change `p-6` to `p-4`, and change the title from `text-base font-semibold` to `text-h2`. **Do not touch** the `ModalPortalContext`, the `dialogRef` effects, or the `showModal()` / `close()` logic — that is the native-`<dialog>` top-layer mechanism that keeps nested Radix overlays from rendering behind the modal.

- [ ] **Step 5: Restyle the Radix overlays**

- `dialog.tsx` and `alert-dialog.tsx`: keep `shadow-elevation-2` (modals are Level 2), change any `p-6` to `p-4`, change title classes to `text-h2` and description classes to `text-body-md text-ink-muted`.
- `popover.tsx`: change `shadow-elevation-2` to **`shadow-elevation-1`** — under v2, popovers are Level 1 and only modals and the command palette are Level 2. Leave `rounded-md`, the collision padding, and the animation classes alone.

- [ ] **Step 6: Restyle sonner**

In `src/components/ui/sonner.tsx`, no token change is needed — it already maps sonner's variables onto `--canvas-pure`, `--ink-main`, `--hairline`, which now carry v2 values. Verify only; do not edit unless the toast renders wrong in Step 9.

- [ ] **Step 7: Typecheck and test**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm test`
Expected: PASS, all suites — the new primitives are now consumed by two refactored files, so a break here means the recomposition changed a contract.

- [ ] **Step 8: Add overlays to the kitchen sink**

Create `src/app/(dev)/design/sections/OverlaysSection.tsx` as a client component rendering: a `Skeleton` row, a `CopyButton`, a `PasswordInput`, a button that opens the `Modal`, and a `Popover`. Import it into `ThemePane.tsx` last.

Note: the Radix overlays and the native `<dialog>` portal to `document.body`, so they escape the `.light` / `.dark` pane wrapper and will render in the **ambient** theme. That is expected, not a bug. Verify overlays by toggling the real theme rather than by comparing panes, and say so in a comment in this section file so the next reader is not confused.

- [ ] **Step 9: Look at it**

Reload `/design`.
- Skeleton pulses and matches the v2 radius.
- `CopyButton` looks like a ghost `Button` and still copies and flips to "Copied" for 1.5s.
- `PasswordInput` toggles visibility and the eye icon sits inside the field's right edge without overlapping text.
- The `Modal` opens, is Level 2, and closes on backdrop click and on Escape.
- The `Popover` opens with a **subtle** Level 1 shadow — visibly lighter than the Modal.
- Toggle the real theme and confirm all overlays re-theme correctly.

- [ ] **Step 10: Commit**

```bash
git add src/components/ui "src/app/(dev)"
git commit -m "Restyle existing primitives to v2 tokens; compose PasswordInput and CopyButton on the new primitives"
```

---

## Task 12: Documentation and final verification

**Files:**
- Modify: `docs/DESIGN.md`
- Modify: `CLAUDE.md`
- Modify: `docs/ADDENDA_LOG.md`
- Modify: `docs/KNOWN_GAPS.md`

- [ ] **Step 1: Record the two token additions in DESIGN.md**

`docs/DESIGN.md` already holds the v2 spec and is otherwise correct — verify it against the implementation rather than rewriting it. Add one subsection under "Color Tokens (OKLCH)":

```markdown
### Additions beyond the original v2 draft (2026-08-14)

| Token | Light | Dark | Why |
|---|---|---|---|
| `--danger` | `oklch(0.52 0.19 25)` | `oklch(0.65 0.18 25)` | v2 defined no destructive colour, but the app archives, deletes and revokes. The pill palette may never be used for a button, so reuse was not an option. |
| `--danger-fg` | `oklch(0.99 0 0)` | `oklch(0.16 0.004 25)` | Foreground pair — see below. |
| `--accent-fg` | `oklch(0.99 0 0)` | `oklch(0.16 0.004 260)` | One accent value cannot be both a background and readable text across both themes: dark `--accent` is light (L 0.62), so near-white on it fails contrast. The foreground flips by theme. This is a contrast requirement, not a style choice. |
```

And amend the pill paragraph to record that the same ~22% chroma cut is applied to dark mode, which the original draft left unspecified.

- [ ] **Step 2: Rewrite the CLAUDE.md § UI/UX pointer**

Replace the whole `### UI/UX Design System (Notion High-Voltage)` section with:

```markdown
### UI/UX Design System (Structural Neutral v2)
A dense, neutral, monochrome-first data tool. Structure comes from hairline
borders and spacing, not shadow. Colour is signal, not decoration. Full spec:
`docs/DESIGN.md`. Live reference: the dev-only route `/design` renders every
primitive in every state in both themes — check a change there before shipping it.

**`src/app/globals.css` is the single source of truth for every token value.**
Read that file for values; a doc copy can only drift. What survives here is the
rules the CSS cannot tell you:

- **Consume primitives from `src/components/ui/`, never one-off classes.** Button, Input, Textarea, Select, Card, Badge, NavItem and the Table shell all exist. A new one-off styled `<button>` is a bug.
- **`--accent` is an unsampled placeholder.** No Twenty CRM reference screenshot was ever provided. Do not describe its value as final or sampled.
- **`--accent` is for primary CTAs, active nav links, focus rings, and inline navigational links only — never decorative.** The decorative pill palette is for category dots and status badges only — never layout borders, never primary buttons.
- **`--accent-fg` / `--danger-fg` exist because those two colours flip lightness between themes.** Never hardcode white text on the accent.
- **The radius scale overrides Tailwind's stock values under the same utility names** (`rounded-xs`/`sm`/`md`/`lg`/`xl`). `rounded-md` is 6px. Do not reason from Tailwind defaults.
- **The type scale does NOT override Tailwind's names.** `text-xs`/`sm`/`base` keep their stock meanings; the v2 roles are extra names (`text-display`/`h1`/`h2`/`title`/`body-md`/`body-sm`/`label`/`caption`), each baking in size, weight and tracking.
- **Level 0 (hairline, no shadow) is the default** for buttons, cards, inputs and table rows. Level 1 is popovers and dropdowns only; Level 2 is modals and the command palette only. Dark mode runs ~3x the light alpha at each stop — keep that ratio if the ramps are retuned.
- **Global focus rule gotcha:** any `:not()` must stay a single `:not()` with a comma-separated list. Chaining `:not(a):not(b)` silently fails to compile under this project's Lightning CSS/Turbopack pipeline — no error, just no focus styling.
- **Going Cold SLA rule:** when a lead's `next_action_at` is overdue, its card border becomes a dashed `--cold` line and its status badge desaturates. This is `Card`'s `cold` prop and `Badge`'s `cold` tone. It is business signal — never repurpose either for styling.
- **Icons are `@tabler/icons-react`, outline only,** stroke 1.75–2, `size-5` in dense contexts and `size-6` in spacious ones. `lucide-react` was fully removed on 2026-08-14.
```

- [ ] **Step 3: Write the addendum**

Append to `docs/ADDENDA_LOG.md` a dated section `## Design System v2 "Structural Neutral" — foundation layer (2026-08-14)` covering: the pivot from Notion High-Voltage; hue 60/240 → 260; the flattening to Level 0 by default; the tightened radius and type scales; the `--danger` / `-fg` additions and why they were unavoidable; the Inter swap and the dropping of unused Geist Mono; the full lucide → Tabler sweep across 19 files; the eight primitives; the `/design` route; the Vitest adoption and its deliberate scope limit; and — stated plainly — that `--accent` is an **unsampled placeholder** because no reference screenshot was ever attached.

- [ ] **Step 4: Add the open gaps**

Append to `docs/KNOWN_GAPS.md` § Open items:

```markdown
- **`--accent` has never been visually confirmed.** ⬜ Open (2026-08-14) — DESIGN.md v2's placeholder (`oklch(0.48 0.16 260)` light / `oklch(0.62 0.15 260)` dark) is in use because no Twenty CRM reference screenshot was ever attached. It must be sampled from a real reference before the design is called done. Everything downstream reads the token, so replacing it is a one-line change.
- **No view consumes the v2 primitives yet.** ⬜ Open (2026-08-14) — the foundation layer shipped, but rolling Button/Input/Select/Card/Badge/NavItem out across the app is Prompt 2, deliberately split so token decisions could be locked and looked at first. Until then every view still uses one-off classes, which now render in v2 tokens but not v2 structure.
- **The Table shell has no consumer.** ⬜ Open (2026-08-14) — built because the brief named it; DESIGN.md v2 puts Table View out of scope. It is bare on purpose: no sorting, selection or virtualisation. Build those with the feature.
- **Existing components have no tests.** ⬜ Open (2026-08-14) — Vitest + RTL were added and cover the 8 new primitives only. Everything predating them is untested.
```

- [ ] **Step 5: Full verification sweep**

Run each and confirm the expected result before claiming anything is done:

```bash
npm run lint
```
Expected: clean.

```bash
npx tsc --noEmit
```
Expected: clean.

```bash
npm test
```
Expected: PASS, all suites, no skipped tests.

```bash
npm run build
```
Expected: clean, and `/design` absent from the prerendered route list.

```bash
grep -rn "lucide-react" src/ package.json
```
Expected: no matches.

```bash
git diff --stat main
```
Expected: only the files named in the File Structure table. Anything else is called out in the report, not quietly kept.

- [ ] **Step 6: Final browser pass**

On `/design`, in both panes and with the real theme toggled both ways: screenshot the full page. Then tab through Button, Input, Select and NavItem and confirm a visible accent focus ring on each.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md docs/
git commit -m "Document Design System v2: DESIGN.md additions, CLAUDE.md pointer, addendum, known gaps"
```

---

## Self-Review Notes

Checked against the spec:

- Spec §1.1–§1.10 → Task 2. §2 → Task 3. §3 → Tasks 5–11. §4 → Task 4. §5.5 → Task 1. §5.75 → Task 0. §5.8 → Task 12. §7 → Task 12 Step 5.
- Every primitive named in the spec has a task: Button (5), Input/Textarea (6), Select (7), Card/Badge (8), NavItem (9), Table shell (10). Refactors (11).
- The three "no clean equivalent" items are all handled explicitly: the Dialog wrapper is not built (Task 11 Step 4 restyles `Modal` in place and says why), `TableRow` ships bare with a scope note (Task 10), and `--danger` plus the `-fg` pairs are documented as additions (Task 12 Step 1).
- Type consistency: `ButtonVariant`/`ButtonSize` (Task 5), `BadgeTone` (Task 8) and `NavIcon` (Task 9) are each defined once, in the task that creates them, and referenced by those names afterwards. `Input`, `Textarea` and `Select` share one label/hint/error contract, asserted identically in all three test files.
- Two traps are called out where they bite rather than left to be discovered: dynamic Tailwind class names (Task 4 Steps 3–4, and a standing rule for every later section file) and Radix/`<dialog>` portals escaping the theme panes (Task 11 Step 8).
