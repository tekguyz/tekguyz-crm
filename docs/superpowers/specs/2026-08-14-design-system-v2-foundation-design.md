# Design System v2 "Structural Neutral" — Foundation Layer (Prompt 1)

Date: 2026-08-14

> **Historical artifact — one value in it is now wrong.** This spec marks
> `--accent` as an unsampled placeholder pending sampling from a Twenty CRM
> reference. It was sampled from the CRM's own brand mark instead, later on
> 2026-08-14, and is final: `oklch(0.53 0.181 263.2)` light /
> `oklch(0.70 0.155 263.2)` dark. See `docs/ADDENDA_LOG.md` § Brand identity +
> `--accent` sampling. Everything else here still stands.
Status: awaiting approval

## Goal

Replace the Notion High-Voltage token system with DESIGN SYSTEM v2 ("Structural
Neutral"), and build a shared primitive component library so every current and
future view consumes tokens and primitives instead of one-off styles.

This is the foundation layer only. Rolling the primitives out across existing
views is Prompt 2 and is explicitly out of scope here.

## Step-zero findings (verified, not assumed)

| Item | Reality |
|---|---|
| Token file | `src/app/globals.css` — Tailwind v4 `@theme` + `@layer base`. No `tailwind.config.*` exists. |
| Icon library | `lucide-react` ^1.23.0. Imported in 19 files; 15 of them live outside `src/components/ui/`. |
| Primitives dir | `src/components/ui/` — contains `Modal.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `popover.tsx`, `sonner.tsx`, `Skeleton.tsx`, `CopyButton.tsx`, `PasswordInput.tsx`. No Button, Input, Select, Card, Badge, NavItem, or TableRow exists. |
| Class-merge helper | `src/lib/utils/cn.ts` exports `cn()` (clsx + tailwind-merge). Reuse it. |
| Fonts | `Geist` + `Geist_Mono` via `next/font/google` in `src/app/layout.tsx`. `font-mono` has zero consumers in `src/`. |
| `docs/DESIGN.md` | Already contains the v2 spec as an uncommitted working-tree change. It is verified against this spec, not rewritten. |
| Reference screenshots | **None attached to the session.** The accent value therefore stays the documented placeholder. |

## Decisions taken

1. **Icon swap is a full mechanical sweep of all 19 files** (import line and icon
   name only — no styling, layout, or logic changes), so `lucide-react` can be
   uninstalled outright. Chosen over a primitives-only swap to avoid shipping two
   icon libraries and pushing cleanup into Prompt 2. This intentionally puts 15
   view files in the diff; each is a one-to-two-line change.
2. **The type scale uses new named roles**, not overrides of Tailwind's stock
   `text-*` names. The radius scale already overrides Tailwind's names and
   `CLAUDE.md` documents that as a gotcha; adding a second such trap is worse
   than carrying two naming systems until Prompt 2.
3. **Sans font switches to Inter; Geist Mono is dropped** in favour of a system
   mono stack. Inter is what the visual reference uses and is marginally tighter
   at 13px. Geist Mono has no consumers.
4. **The accent is the placeholder value, flagged as unconfirmed.** No value is
   invented or approximated.
5. **A test runner is added** (Vitest + React Testing Library), scoped to the 8
   new primitives. The brief's "zero new dependencies" fence was lifted for this
   on 2026-08-14. See §5.5.
6. **CLAUDE.md gets a seven-item structural cleanup** beyond the § UI/UX pointer
   the brief asks for, approved after an audit on 2026-08-14. See §5.75.

---

## 1. Tokens — `src/app/globals.css`

### 1.1 Core colour tokens

Every hue moves to `260` (cool neutral), replacing the current mix of `60` and
`240`. This is the single largest lever in the visual pivot.

`:root` (light):

```
--canvas-soft: oklch(0.98 0.002 260);
--canvas-pure: oklch(1.00 0     0  );
--ink-main:    oklch(0.15 0.004 260);
--ink-muted:   oklch(0.52 0.006 260);
--hairline:    oklch(0.90 0.003 260);
--accent:      oklch(0.48 0.16  260);  /* PLACEHOLDER — unconfirmed */
--cold:        oklch(0.68 0.004 260);
```

`.dark`:

```
--canvas-soft: oklch(0.14 0.004 260);
--canvas-pure: oklch(0.18 0.004 260);
--ink-main:    oklch(0.97 0     0  );
--ink-muted:   oklch(0.66 0.008 260);
--hairline:    oklch(0.28 0.005 260);
--accent:      oklch(0.62 0.15  260);  /* PLACEHOLDER — unconfirmed */
--cold:        oklch(0.42 0.006 260);
```

Note on hairline: light gives a 10-point lightness gap (`0.90` on `1.00`), dark
gives the same 10-point gap (`0.28` on `0.18`). The current file carries a
comment about having had to brighten the dark hairline for exactly this reason;
v2's published numbers already have parity, so that comment is replaced with a
note recording the parity rule rather than the old one-off fix.

### 1.2 Accent placeholder — mandatory annotation

`globals.css` carries an inline comment at both accent declarations reading that
the value is an unsampled placeholder pending visual sampling from a Twenty CRM
reference screenshot, and that it must not be treated as final. The same caveat
already exists in `docs/DESIGN.md` and is repeated verbatim in the final report.

### 1.3 Danger tone — an addition beyond DESIGN.md v2

DESIGN.md v2 defines no destructive/danger colour, but the app has real
destructive affordances (archive, delete, revoke, rotate secret) and `Button`
needs a `danger` variant. The decorative pill palette cannot be reused for this:
the permanent rule is that pills are for status/category only, never buttons.

Therefore this spec **adds** two tokens and records the addition in DESIGN.md:

```
:root  { --danger: oklch(0.52 0.19 25); }
.dark  { --danger: oklch(0.65 0.18 25); }
```

Approved at spec review 2026-08-14.

**Foreground pairs — a second necessary addition.** A single `--accent` cannot
serve as both a button background and readable text, because v2's dark accent
(`L 0.62`) is light: near-white text on it fails contrast, while in light mode
(`L 0.48`) near-white is required. The same applies to `--danger`. So each gets
a paired foreground token that flips by theme:

```
:root { --accent-fg: oklch(0.99 0     0  ); --danger-fg: oklch(0.99 0     0 ); }
.dark { --accent-fg: oklch(0.16 0.004 260); --danger-fg: oklch(0.16 0.004 25); }
```

This is a mechanical contrast requirement, not a style choice. Both pairs are
recorded in `docs/DESIGN.md` as additions to v2 and called out in the report.

### 1.4 Decorative pill palette — desaturated

Same six hues, same structural role (status dots and category badges only —
never layout borders, never primary buttons). Chroma is multiplied by `0.78`
(a ~22% cut, mid-range of the spec's "20–25%") in **both** themes. DESIGN.md
only specifies the light-mode cut; applying the same ratio to dark keeps the two
themes reading as one palette, and that reasoning is recorded in the CSS.

Light:

| Token | Value |
|---|---|
| `--pill-purple-bg` | `oklch(0.94 0.031 300)` |
| `--pill-purple-fg` | `oklch(0.45 0.140 300)` |
| `--pill-pink-bg` | `oklch(0.94 0.035 350)` |
| `--pill-pink-fg` | `oklch(0.50 0.148 350)` |
| `--pill-orange-bg` | `oklch(0.94 0.039 55)` |
| `--pill-orange-fg` | `oklch(0.48 0.133 45)` |
| `--pill-teal-bg` | `oklch(0.94 0.031 195)` |
| `--pill-teal-fg` | `oklch(0.45 0.078 195)` |
| `--pill-green-bg` | `oklch(0.94 0.039 145)` |
| `--pill-green-fg` | `oklch(0.45 0.109 145)` |
| `--pill-sky-bg` | `oklch(0.94 0.023 235)` |
| `--pill-sky-fg` | `oklch(0.48 0.094 235)` |

Dark:

| Token | Value |
|---|---|
| `--pill-purple-bg` | `oklch(0.30 0.062 300)` |
| `--pill-purple-fg` | `oklch(0.86 0.047 300)` |
| `--pill-pink-bg` | `oklch(0.30 0.070 350)` |
| `--pill-pink-fg` | `oklch(0.87 0.055 350)` |
| `--pill-orange-bg` | `oklch(0.30 0.070 55)` |
| `--pill-orange-fg` | `oklch(0.85 0.055 55)` |
| `--pill-teal-bg` | `oklch(0.30 0.047 195)` |
| `--pill-teal-fg` | `oklch(0.85 0.039 195)` |
| `--pill-green-bg` | `oklch(0.30 0.062 145)` |
| `--pill-green-fg` | `oklch(0.85 0.047 145)` |
| `--pill-sky-bg` | `oklch(0.30 0.039 235)` |
| `--pill-sky-fg` | `oklch(0.85 0.039 235)` |

Lightness is untouched in every pair, so the fg/bg contrast ratio that exists
today is preserved; only saturation drops.

### 1.5 Radius scale

Overrides Tailwind's stock scale under the same utility names, as today. Values
tighten:

| Token | v1 | v2 |
|---|---|---|
| `--radius-xs` | 4px | **3px** |
| `--radius-sm` | 5px | **4px** |
| `--radius-md` | 8px | **6px** |
| `--radius-lg` | 12px | **8px** |
| `--radius-xl` | 16px | **10px** |

The existing "these override Tailwind's stock values" comment stays, updated.

### 1.6 Elevation

Level 0 is **no shadow at all** and is the default for buttons, cards, table
rows, and inputs. It needs no token — it is the absence of one. The v1 habit of
giving every button and card a Level-1 shadow is removed.

```
/* light */
--elevation-1: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05);
--elevation-2: 0 2px 6px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06),
               0 20px 44px rgba(0,0,0,0.06);

/* dark — ~3x alpha, same ratio rule the current file already documents */
--elevation-1: 0 1px 2px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.18);
--elevation-2: 0 2px 6px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.20),
               0 20px 44px rgba(0,0,0,0.22);
```

Level 1 is for dropdowns and popovers only. Level 2 is for modals and the
command palette only. Both ramps are lighter than their v1 counterparts.

### 1.7 Type scale — new named roles

Registered in `@theme` as `--text-*`, with size, line-height, weight, and
tracking all baked in, so a single utility class is complete and cannot drift:

| Utility | Size | Line-height | Weight | Tracking |
|---|---|---|---|---|
| `text-display` | 22px | 1.2 | 700 | -0.015em |
| `text-h1` | 18px | 1.3 | 650 | -0.01em |
| `text-h2` | 15px | 1.35 | 600 | -0.01em |
| `text-title` | 14px | 1.4 | 600 | normal |
| `text-body-md` | 13px | 1.5 | 400 | normal |
| `text-body-sm` | 12px | 1.5 | 400 | normal |
| `text-label` | 11px | 1.4 | 550 | 0.02em |
| `text-caption` | 11px | 1.45 | 400 | normal |

Tailwind's own `text-xs` / `text-sm` / `text-base` keep their stock meanings.
The base-layer `h1`–`h6` rule changes its letter-spacing from `-0.04em` to
`-0.015em`; its `font-weight: 700` stays, and a `text-*` utility still overrides
it because utilities sit in a later cascade layer.

### 1.8 Fonts

`src/app/layout.tsx` loads `Inter` from `next/font/google` under
`--font-inter`. The `Geist` and `Geist_Mono` imports are removed. In
`globals.css`, `--font-sans` points at `var(--font-inter)` and `--font-mono`
points at a system stack (`ui-monospace, SFMono-Regular, Menlo, Consolas,
monospace`). No package is added — `next/font/google` is built in.

### 1.9 Accessibility floor

Two additions to `@layer base`:

- A visible focus ring on every interactive element via `:focus-visible`, using
  `--accent` as an `outline` with an offset, plus the existing input/select/
  textarea focus treatment updated to Level-0 (border colour change only, no
  shadow — the v1 rule added a Level-1 shadow, which contradicts v2's flat
  default). **Any `:not()` in this rule must remain a single `:not()` with a
  comma-separated selector list** — chaining separate `:not(a):not(b)` calls
  silently fails to compile under this project's Lightning CSS / Turbopack
  pipeline, per `CLAUDE.md`.
- A `@media (prefers-reduced-motion: reduce)` block that reduces transition and
  animation durations to near-zero and disables `scroll-behavior: smooth`.

### 1.10 Spacing

The 4px/8px grid is unchanged. Only component interior padding tightens, and
that lives in the primitives, not in tokens: card padding `16px` (was `24px`),
input padding `4px 8px` (was `6px`).

---

## 2. Icon library swap

Add `@tabler/icons-react` (MIT). Remove `lucide-react`. This is the only new
**runtime** dependency; the test runner in §5.5 adds devDependencies, which the
brief's dependency fence was explicitly lifted to allow (approved 2026-08-14).

Outline variants only. Stroke `1.75`–`2`; Tabler's default stroke is `2`, which
is inside range, so the view sweep does not set it explicitly. Primitives set
`stroke={1.75}` where an icon is part of the primitive itself. Sizing continues
to come from Tailwind `size-*` classes exactly as it does today.

Full mapping, all 19 files:

| File | lucide | tabler |
|---|---|---|
| `src/components/command/CommandBar.tsx` | `Search` | `IconSearch` |
| `src/components/contacts/ContactCard.tsx` | `Phone`, `MessageSquare`, `Mail`, `MapPin` | `IconPhone`, `IconMessage`, `IconMail`, `IconMapPin` |
| `src/components/help/HelpDrawer.tsx` | `Search` | `IconSearch` |
| `src/components/help/HelpTooltip.tsx` | `HelpCircle` | `IconHelpCircle` |
| `src/components/help/HelpTrigger.tsx` | `HelpCircle` | `IconHelpCircle` |
| `src/components/import/CsvUploadDropzone.tsx` | `UploadCloud` | `IconCloudUpload` |
| `src/components/leads/CreateLeadModal.tsx` | `Plus` | `IconPlus` |
| `src/components/leads/profile/NoteCaptureForm.tsx` | `Mic`, `Square` | `IconMicrophone`, `IconSquare` |
| `src/components/leads/profile/ProfileSheet.tsx` | `X` | `IconX` |
| `src/components/pipeline/FocusListCard.tsx` | `Star` | `IconStar` |
| `src/components/pipeline/KanbanCard.tsx` | `Star` | `IconStar` |
| `src/components/settings/CopyInviteLinkButton.tsx` | `Copy`, `Check` | `IconCopy`, `IconCheck` |
| `src/components/shell/Header.tsx` | `Search`, `LogOut` | `IconSearch`, `IconLogout` |
| `src/components/shell/Sidebar.tsx` | `LayoutGrid`, `KanbanSquare`, `Users`, `Upload`, `Settings` | `IconLayoutGrid`, `IconLayoutKanban`, `IconUsers`, `IconUpload`, `IconSettings` |
| `src/components/shell/ThemeToggle.tsx` | `Sun`, `Moon`, `Monitor` | `IconSun`, `IconMoon`, `IconDeviceDesktop` |
| `src/components/ui/CopyButton.tsx` | `Copy`, `Check` | `IconCopy`, `IconCheck` |
| `src/components/ui/dialog.tsx` | `X` | `IconX` |
| `src/components/ui/Modal.tsx` | `X` | `IconX` |
| `src/components/ui/PasswordInput.tsx` | `Eye`, `EyeOff` | `IconEye`, `IconEyeOff` |

Each Tabler name is verified against the installed package before the edit; any
name that does not resolve is corrected and the correction recorded in the
report. The 15 view files receive **only** the import line and JSX tag-name
change — no className, prop, or structural edits.

---

## 3. Primitives — `src/components/ui/`

All primitives are presentational, accept `className` merged through `cn()`,
forward their native props and `ref`, and stay under the 200-line per-file cap.
Any primitive approaching the cap splits into a sibling at the same level.

### Built new

| File | API sketch | Notes |
|---|---|---|
| `Button.tsx` | `variant: primary \| secondary \| ghost \| danger`; `size: sm \| md`; `loading?: boolean` | Flat: hairline border, **no shadow** in any variant. `primary` = accent bg + canvas-pure text. `secondary` = canvas-pure bg + hairline. `ghost` = transparent, hover canvas-soft. `danger` = `--danger`. Disabled and loading are distinct states. |
| `Input.tsx` | `label?`, `hint?`, `error?`, plus native input props | Padding `4px 8px`, `rounded-xs`, hairline border, focus recolours the border to accent with no shadow. `error` swaps border to `--danger` and renders the message with `text-caption`. |
| `Textarea.tsx` | same shape as `Input` | Sibling file so `Input.tsx` stays under cap. |
| `Select.tsx` | `label?`, `error?`, plus native select props | Wraps a native `<select>` (matching the seven files that already use one) with a Tabler chevron and `appearance-none`. |
| `Card.tsx` | `cold?: boolean`, `as?` | Level 0: hairline border, `rounded-lg`, `16px` padding, no shadow. `cold` switches the border to `1px dashed var(--cold)` — this is the Going Cold SLA rule. |
| `Badge.tsx` | `tone: neutral \| purple \| pink \| orange \| teal \| green \| sky \| cold`; `dot?: boolean` | `rounded-sm`, `text-label`. `cold` is the desaturated grayscale tone the SLA rule requires on an overdue lead's status badge. |
| `NavItem.tsx` | `href`, `icon`, `active`, `children` | `rounded-md`, states: idle / hover (canvas-soft) / active (accent text + tinted bg) / focus-visible. Presentational only — no routing logic, the caller passes `active`. |
| `TableRow.tsx` | exports `Table`, `TableHead`, `TableRow`, `TableCell` | Bare structural shell: hairline row separators, `rounded-sm` cells, dense `text-body-sm`. **No sorting, selection, or virtualisation** — see Known Limitations. |

### Refactored

| File | Change |
|---|---|
| `PasswordInput.tsx` | Composes the new `Input` instead of carrying its own field styling. Behaviour (show/hide toggle) unchanged. |
| `Skeleton.tsx` | Restyled to the v2 radius scale and canvas tokens. |
| `Modal.tsx` | Restyled to v2 tokens (`rounded-lg`, Level 2, `16px` padding, Tabler close icon). **Its native `<dialog>` top-layer portal mechanism is not touched.** |
| `dialog.tsx`, `alert-dialog.tsx`, `popover.tsx` | Restyled to v2 tokens. `popover.tsx` moves from Level 2 to Level 1 per the new elevation rule. |
| `sonner.tsx` | Toast surface restyled to v2 tokens. |
| `CopyButton.tsx` | Composes the new `Button` (`ghost` variant) instead of its own classes. |

### Known limitations, to be reported

- **No new Dialog wrapper is created.** `Modal.tsx` uses a native `<dialog>`
  promoted to the browser top layer, with a context that lets nested Radix
  overlays portal into the dialog node rather than `document.body`. Replacing it
  with a generic wrapper risks reintroducing the "nested overlay renders behind
  the modal" bug for no visual gain. `Modal.tsx` is restyled in place and
  documented as the canonical modal shell; `dialog.tsx` remains the Radix
  drawer/sheet primitive.
- **`TableRow` has no consumer.** No table view exists, and DESIGN.md v2
  explicitly excludes Table View from this system's scope. The shell is built
  because the brief names it, kept deliberately minimal, and exercised only on
  the kitchen-sink page.
- **`--danger` is an addition beyond DESIGN.md v2** (see §1.3).

---

## 4. Kitchen-sink reference page

Route: `src/app/(dev)/design/page.tsx`.

- Outside the `(app)` route group, so it inherits no AppShell and touches no
  fenced file.
- Dev-only: the page calls `notFound()` when `process.env.NODE_ENV ===
  "production"`, so the route returns a 404 in a production build.
- Renders **every primitive in every state twice on one page** — once in the
  ambient theme and once inside an explicit `.dark` wrapper `div`. Because
  `.dark` is a plain class selector redeclaring the custom properties, a nested
  wrapper re-themes its own subtree, so both themes are verifiable in one
  screenshot without toggling. The real `ThemeToggle` still works on top of this.
- Also renders the raw token swatches: every colour token, the radius scale, the
  two elevation ramps, and every type role.
- Section components live in `src/app/(dev)/design/sections/` (one file per
  primitive family) to respect the 200-line cap.

---

## 5.5 Test runner

The repo has no test runner today. One is added as part of this work (the
brief's "zero new dependencies" fence was lifted for this purpose, approved
2026-08-14).

**Stack:** Vitest + React Testing Library.

devDependencies added: `vitest`, `@vitejs/plugin-react`, `jsdom`,
`@testing-library/react`, `@testing-library/jest-dom`,
`@testing-library/user-event`.

Config: `vitest.config.ts` (jsdom environment, `@` path alias mirroring
`tsconfig.json`) and `src/test/setup.ts` (imports `@testing-library/jest-dom`).
`package.json` gains `"test": "vitest run"` and `"test:watch": "vitest"`.

**What is tested — the 8 new primitives only.** Each primitive's test asserts
its behavioural and accessibility contract:

- `Button` — variant and size class mapping; `disabled` sets the attribute;
  `loading` sets `disabled` and `aria-busy` and renders the spinner.
- `Input` / `Textarea` — `label` wires `htmlFor` to the input id; `error` sets
  `aria-invalid` and links the message via `aria-describedby`; `hint` links
  instead when there is no error; a caller-supplied `id` wins over the
  generated one.
- `Select` — same label and error wiring; the chevron is `aria-hidden` and does
  not intercept pointer events.
- `Card` — `cold` swaps the border to dashed `--cold` and sets `data-cold`.
- `Badge` — every tone maps to its pill token pair; `dot` renders an
  `aria-hidden` dot.
- `NavItem` — `active` sets `aria-current="page"`; inactive does not.
- Table shell — renders semantic `table`/`thead`/`tbody`/`tr`/`td`/`th`.

**What is deliberately not tested:** token values and anything visual. A test
asserting `bg-accent` appears in a class string proves nothing about whether the
OKLCH value is right. Colour, contrast, and elevation are verified in the
browser on the kitchen-sink page, and that verification is not optional.

Existing untested components stay untested. No smoke tests are added for the
refactored primitives — a render-without-crash assertion is maintenance cost
without a real contract behind it.

---

## 5.75 CLAUDE.md cleanup

Approved 2026-08-14 after an audit. Seven changes, all structural, nothing
deleted — content moves to companion docs. Done as its own commit **before** the
design work, because item 1 changes how the design work is allowed to split
files.

1. **200-line hard cap → soft signal.** The cap is stated as a prohibition
   justified by "LLM context windows". It is also the direct cause of a
   documented data-loss bug class: CLAUDE.md line 100 warns that a form split
   across siblings hides its field set, so no single file shows it — and that
   cost five silently-NULLed columns across two incidents. Rewritten to: split
   by responsibility; ~200 lines is a smell worth looking at, not a wall; never
   split a cohesive unit purely to get under a number.
2. **"When unsure, log it" → "when unsure, leave it out."** Line 111's advice
   contradicts lines 5–12, which record two emergency compressions after the
   file reached 150KB. The file's own history disproves the rule.
3. **Dead tool names.** Line 107 instructs the reader to use `preview_click`
   and `preview_eval`. Neither exists. Rewritten against the current Browser
   pane tools (`computer`, `javascript_tool`), keeping the underlying warning —
   a state-changing click can report success while doing nothing.
4. **§ 2, the closed 15-phase roadmap (31 lines)** moves verbatim to
   `docs/ADDENDA_LOG.md`, replaced by a two-line pointer. Every entry already
   said "shipped, see ADDENDA_LOG.md"; it is a table of contents for another
   file.
5. **Build discipline** rewritten. "Build one phase at a time… apply that
   phase's migration" describes the closed roadmap; there are no more phases and
   most work has no migration. Becomes: finish and verify one unit before
   starting the next; never generate ahead of what has been verified.
6. **Known Gaps (19 lines + a 6-sentence maintenance preamble)** moves to a new
   `docs/KNOWN_GAPS.md`, replaced by one pointer line. It is a bug tracker
   living in an instructions file, and it is the documented cause of both
   compressions. The maintenance rules move with it.
7. **Reference Index (8 lines)** trimmed to three: what lives here, what lives
   in `SCHEMA_REFERENCE.md`, what lives in `ADDENDA_LOG.md`. The byte-count
   compression changelog moves to `ADDENDA_LOG.md`.

**Explicitly kept unchanged:** the multi-tenant security model, the Form/Action
field-parity rule, the "a classifier routes a lead, it never hides one" rule,
the Supabase write-tool restriction, and the three browser gotchas
(`document.visibilityState`, Radix focus return, synthetic `mouseover`). Each is
concrete, non-obvious, and paid for by a real incident.

Expected result: 133 lines → roughly 60.

---

## 5.8 Documentation

| File | Change |
|---|---|
| `docs/DESIGN.md` | Verified against this spec rather than rewritten — it already holds v2. Two edits only: record the `--danger` addition (§1.3) and the dark-mode pill desaturation ratio (§1.4), so the doc and the CSS agree. |
| `CLAUDE.md` § UI/UX Design System | Pointer rewritten for v2. Keeps the permanent rules: accent is CTA/nav/focus/link only, radius overrides Tailwind's names, the single-`:not()` focus gotcha, Going Cold behaviour. Updates the elevation rule to "Level 0 is the default and has no shadow; Level 1 popovers only; Level 2 modals only". Notes the icon library is now `@tabler/icons-react`. Names the kitchen-sink route as the reference surface, and states that Prompt 2 (view rollout) is still outstanding. |
| `docs/ADDENDA_LOG.md` | New dated addendum: the full v2 pivot narrative, the accent placeholder flag, the icon sweep, and the primitive inventory. |
| `CLAUDE.md` Known Gaps | New entry: view rollout to v2 primitives is deferred to Prompt 2; the accent value is unconfirmed pending reference sampling. |

---

## 6. Out of scope — explicitly not done

- Any change to a page or view's markup, layout, or logic. The 15 view files
  touched by the icon sweep get import-and-name changes only.
- Any file under `src/lib/actions/`, any migration file, any page under
  `src/app/(app)/`.
- Table View, Saved Views, Group-by, Kanban density toggle, Team Role Management.
- Any runtime dependency other than `@tabler/icons-react`. Test devDependencies
  per §5.5 are in scope.
- Tests for anything other than the 8 new primitives.
- Any CLAUDE.md change beyond the seven audited items in §5.75 and the
  § UI/UX Design System pointer.

Note: existing views will **look** different immediately, because they consume
the shared tokens. That is the intended effect of a token swap and is not a
scope breach — no view file is edited for styling.

---

## 7. Verification

1. `npm run build` — clean.
2. `npm run lint` — clean.
2a. `npm test` — all primitive tests pass.
2b. `npx tsc --noEmit` — clean.
3. `grep -r "lucide-react" src` returns nothing; `lucide-react` is absent from
   `package.json`.
4. Browser pass on `/design` in light and dark: every primitive, every state,
   both themes, screenshotted.
5. Keyboard pass on `/design`: tab through Button, Input, Select, NavItem and
   confirm a visible focus ring on each.
6. `git diff --stat` reviewed against the declared file scope; anything outside
   it is called out in the report rather than silently included.

## 8. Report contract

The closing report states: what shipped; **the exact accent value and that it is
an unsampled placeholder, not a sampled value**; the full list of primitives
built and refactored; every component with no clean primitive equivalent and how
it was handled (Dialog wrapper, TableRow, `--danger`, the `-fg` pairs); the test
runner added and what it does and does not cover; the CLAUDE.md cleanup result;
and anything skipped.
