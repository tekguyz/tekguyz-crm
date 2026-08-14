# TEKGUYZ CRM: DESIGN SYSTEM v2 — "Structural Neutral"

Replaces Notion High-Voltage in full. Written from Twenty CRM as visual reference,
implemented as original tokens — no code, CSS, or config copied from Twenty's
(AGPL-3.0) source. Scoped to TEKGUYZ CRM's actual existing surface area only.

## Philosophy
Dense, neutral, monochrome-first data tool. Structure communicated through hairline
borders and spacing, not shadow. Color is signal, not decoration — reserved almost
entirely for status/category tags. One accent, used sparingly. Outline iconography,
not filled. This is a utility instrument, not a marketing surface — resist the
"friendly SaaS" instinct toward soft shadows, big radii, and generous whitespace.

## Color Tokens (OKLCH)
`--accent` is a **placeholder pending visual sampling** — see Prompt 1, step zero.
Do not treat the value below as final; it exists so components have something to
render against before the real value is sampled.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas-soft` (page floor) | `oklch(0.98 0.002 260)` | `oklch(0.14 0.004 260)` | App background |
| `--canvas-pure` (card/input surface) | `oklch(1.00 0.000 0)` | `oklch(0.18 0.004 260)` | Cards, inputs, panels |
| `--ink-main` (primary text) | `oklch(0.15 0.004 260)` | `oklch(0.97 0.000 0)` | Body/headings |
| `--ink-muted` (secondary text) | `oklch(0.52 0.006 260)` | `oklch(0.66 0.008 260)` | Metadata, timestamps, labels |
| `--hairline` (1px borders) | `oklch(0.90 0.003 260)` | `oklch(0.28 0.005 260)` | Every structural border |
| `--accent` — **PLACEHOLDER, sample from reference** | `oklch(0.48 0.16 260)` | `oklch(0.62 0.15 260)` | Primary CTAs, active nav, focus rings, links only — never decorative |
| `--cold` (SLA breach tone) | `oklch(0.68 0.004 260)` | `oklch(0.42 0.006 260)` | Going Cold dashed border/badge — same behavior, recalibrated hue |

Hue `260` (cool neutral) replaces the old `60` (warm) across the board — this is
the single biggest lever in reading as "Twenty" rather than "Notion." Decorative
pill palette (purple/pink/orange/teal/green/sky) is retained structurally but
desaturate each by roughly 20–25% from current values in light mode — Twenty's
tag chips read muted/pastel, not saturated.

As implemented (2026-08-14), the cut is chroma × 0.78 (a ~22% reduction) with
lightness untouched in every pair, so existing fg/bg contrast is preserved and
only saturation drops. **The same ×0.78 ratio is applied to dark mode**, which
this draft left unspecified — the two themes have to read as one palette, and
desaturating only one of them would have split them.

### Additions beyond the original v2 draft (2026-08-14)

| Token | Light | Dark | Why |
|---|---|---|---|
| `--danger` | `oklch(0.52 0.19 25)` | `oklch(0.65 0.18 25)` | v2 defined no destructive colour, but the app archives, deletes and revokes. The pill palette may never be used for a button, so reuse was not an option. |
| `--danger-fg` | `oklch(0.99 0 0)` | `oklch(0.16 0.004 25)` | Foreground pair — see below. |
| `--accent-fg` | `oklch(0.99 0 0)` | `oklch(0.16 0.004 260)` | One accent value cannot be both a background and readable text across both themes: dark `--accent` is light (L 0.62), so near-white on it fails contrast. The foreground flips by theme. This is a contrast requirement, not a style choice. |

## Typography
Font: **Inter** (if not already loaded, add via `next/font`). Tighter tracking
than v1: headings `-0.015em` (was `-0.04em` — v1 read as marketing-display,
this should read as dense utility). Base body size drops one step for density:

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Display | 22px | 700 | -0.015em |
| Heading-1 | 18px | 650 | -0.01em |
| Heading-2 | 15px | 600 | -0.01em |
| Title | 14px | 600 | normal |
| Body-md | 13px | 400 | normal |
| Body-sm | 12px | 400 | normal |
| Label | 11px | 550 | 0.02em, uppercase optional |
| Caption | 11px | 400 | normal |

## Spacing
**Unchanged — 4px/8px grid already matches Twenty's own** (`spacing[1]=4px`,
`spacing[2]=8px`, confirmed against their token architecture). No migration risk
here. Component interior padding tightens slightly to match the denser type
scale: card padding `16px` (was `24px`), input padding `4px 8px` (was `6px` all
sides).

## Border Radius Scale
Tightened across the board — Twenty reads structurally sharper, not soft:

| Token | Value | Use |
|---|---|---|
| `rounded-xs` | 3px | Form fields, inline chips |
| `rounded-sm` | 4px | Menu items, list rows, table cells, status pills |
| `rounded-md` | 6px | Buttons, nav items, small cards |
| `rounded-lg` | 8px | Cards, modals |
| `rounded-xl` | 10px | Large containers, command palette |
| `rounded-full` | 9999px | Avatars, status dots |

## Elevation & Depth
Near-flat by default. This is the other big lever:
- **Level 0 (default for everything)**: hairline only, zero shadow. Buttons,
  cards, table rows — all flat + bordered, not shadow-raised. (v1 gave buttons
  and default cards a soft Level-1 shadow — that goes away entirely.)
- **Level 1**: dropdowns/popovers only. One subtle 2-stop shadow, lighter than
  v1's Level 1.
- **Level 2**: modals and the command palette only. Moderate shadow — still
  lighter than v1's Level 2.

## Iconography
Switch to **`@tabler/icons-react`** (MIT — confirmed independent of Twenty's
AGPL status, clean to install directly). Outline style only, no filled variants.
Stroke width `1.75`–`2`. Size `20px` in dense contexts (nav, table rows, inline),
`24px` in spacious contexts (empty states, feature callouts). Whatever icon
library the app currently uses gets fully audited and replaced — see Prompt 1
step zero for the actual current library and full swap mapping.

## Functional-state visual language — reinterpreted, not dropped
These encode real business logic and must survive the re-skin with identical
behavior, restyled to the new tokens:
- **Going Cold SLA rule**: `next_action_at` overdue → card border switches to
  `--cold` dashed (was solid gray dashed, same idea, new hue), badge desaturates.
- **Decorative pill palette**: still status/category dots only, never borders or
  primary buttons — recalibrated to the desaturated palette above.
- **Resurrection Engine, click-to-action shortcuts, drag/reorder**: pure
  behavior, zero visual footprint — untouched by this initiative.

## Scope — what this system covers
Applies to every view that currently exists: AppShell nav, Today's Agenda (SLA
Critical / High-Value / Starred / Tasks Due), Kanban board, Focus List,
Contacts card grid, Profile Sheet (brief/timeline/notes/tasks), Settings
(org details, account, webhook rotation, API keys), all modals (EditLeadModal,
CSV Import Wizard, confirmation dialogs), Help drawer + inline tooltips.

**Explicitly does not cover** (don't exist yet — built directly in this system
when their time comes, not retrofitted later): Table View, Saved Views,
Group-by, Kanban compact/dense toggle, Team Role Management UI.
