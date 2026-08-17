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
`--accent` is **sampled and final** as of 2026-08-14 — derived from the brand
mark's blue. See § `--accent` — SAMPLED AND CLOSED at the end of this file for
the derivation and the contrast audit.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas-soft` (page floor) | `oklch(0.98 0.002 260)` | `oklch(0.14 0.004 260)` | App background |
| `--canvas-pure` (card/input surface) | `oklch(1.00 0.000 0)` | `oklch(0.18 0.004 260)` | Cards, inputs, panels |
| `--ink-main` (primary text) | `oklch(0.15 0.004 260)` | `oklch(0.97 0.000 0)` | Body/headings |
| `--ink-muted` (secondary text) | `oklch(0.52 0.006 260)` | `oklch(0.66 0.008 260)` | Metadata, timestamps, labels |
| `--hairline` (1px borders) | `oklch(0.90 0.003 260)` | `oklch(0.28 0.005 260)` | Every structural border |
| `--accent` — **sampled from the brand mark, final** | `oklch(0.53 0.181 263.2)` | `oklch(0.70 0.155 263.2)` | Primary CTAs, active nav, focus rings, links only — never decorative |
| `--cold` (SLA breach tone) | `oklch(0.68 0.004 260)` | `oklch(0.42 0.006 260)` | Going Cold dashed `Card`/`TableRow` border **only** — a border, never text. Do not retune it to fix text contrast |
| `--cold-fg` (SLA breach text) | `oklch(0.55 0.004 260)` | `oklch(0.59 0.006 260)` | `Badge`'s `cold` tone label. Same hue/chroma as `--cold`, lightness moved to clear AA: 4.58:1 light / 4.84:1 dark on `--canvas-soft` (added 2026-08-17) |

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
| `--accent-fg` | `oklch(0.99 0 0)` | `oklch(0.16 0.004 260)` | One accent value cannot be both a background and readable text across both themes: dark `--accent` is light (L 0.70 as shipped), so near-white on it fails contrast. The foreground flips by theme. This is a contrast requirement, not a style choice. |

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


---

## The Application Shell (2026-08-16)

The shell is the frame every signed-in view sits inside: sidebar, header, and
the mobile navigation model. Waves 2a–2c applied the v2 tokens to the shell's
existing *structure*; this section defines the structure itself. Six decisions,
all binding.

### 1. Search is a control, not a field

There is no search field in the header. Command entry is one compact `⌘K`
button (`CommandTrigger`) that opens the existing command palette. A field
cannot survive a collapsed sidebar or a phone viewport — it needs width it will
not have — whereas one button works at every width.

The `⌘K` / `Ctrl-K` listener lives in `ShellContext`, not in the header, so the
shortcut works from every route whether or not the affordance is on screen. The
keycap hint is `hidden md:inline`: a phone has no ⌘, and printing a shortcut
nobody can press is noise. **Search never moves into the sidebar.**

### 2. The header holds exactly two things

Command entry on the left, the identity menu on the right. At every width.

Name, avatar, theme toggle, help and sign out were five controls doing one job.
They are now one avatar-triggered `DropdownMenu`:

- The **theme control renders inline in the menu** as a `DropdownMenuRadioGroup`
  of three items (System / Light / Dark) — not the old cycle button. A cycle
  hides the current state behind one glyph; three explicit rows show it and cost
  the same single interaction. Radio semantics are also what "one of three, this
  one is on" means to a screen reader, and menu items join the menu's roving
  focus, which loose buttons would not.
- **Help and sign out are menu items.** Help stays a drawer; it does not need
  permanent header real estate.
- Sign out submits a `<form action={signOut}>` that lives *outside* the portaled
  menu content, via `requestSubmit()`. A form nested inside the content would be
  racing its own removal when the menu closes.
- Opening the Help drawer from a menu item focuses the menu trigger first, on
  the next animation frame. `HelpContext` restores focus to whatever was focused
  at open time, and a menu row is about to unmount.

**Workspace identity is not a header concern.** On desktop it is the sidebar's
`WorkspaceBlock`; on mobile it is the "More" sheet's title.

### 3. Sidebar navigation is flat — permanently

No nesting, no groups, no disclosure triangles, at any width, ever. All five
destinations render as one unbroken list. When Saved Views ships it belongs in
the content area as a view switcher above the table, **not** as sidebar
children. This is a deliberate divergence from Twenty CRM, which nests views in
the sidebar and gets noisy.

`PRIMARY_NAV` / `SECONDARY_NAV` in `src/components/shell/nav-items.ts` is *not*
a hierarchy. The split exists only because the mobile tab bar has four slots and
the fourth is "More".

### 4. Collapse is manual, desktop-only, and cookie-persisted

A toggle in the sidebar footer collapses it to a **56px icon rail** (expanded:
**240px**). It never fires off a viewport query — below `md` the sidebar is not
displayed in either state, so an automatic collapse would be a third state
nobody asked for.

**The state is a cookie (`tg_sidebar`), never localStorage.** localStorage
cannot be read on the server and cannot be read before hydration, so a
localStorage-backed sidebar paints expanded and snaps to collapsed a frame
later — a visible flash on every navigation for anyone who prefers the rail. The
cookie travels with the request, `src/app/(app)/layout.tsx` reads it during
render, and the HTML that arrives already carries `w-14`. Default when unset is
expanded: a first-time user should see labels, not an unexplained column of
icons. Helpers live in `src/lib/shell/sidebar-cookie.ts`.

**The collapse animates `translate`, never `width`, and the rail is overlaid
rather than in flow** (revised 2026-08-17). The original `transition-[width]` on
a `shrink-0` flex sibling relaid out the whole content area on every frame,
which measured as dropped frames on the Pipeline board. The `<aside>` is now
`position: absolute` inside the shell's `relative` root row, and two
counter-translated layers reproduce a width animation on the compositor: an
outer 240px `overflow-hidden` frame translating `0 → -184px`, and an inner
column translating `0 → +184px`, so the content never moves while the frame's
right edge sweeps 240px → 56px. A separate `aria-hidden` in-flow spacer carries
the content column's leading offset and is **deliberately not transitioned** —
its width flips once, in the same commit as the toggle.

This is global, never conditional on the route. A transition that behaves
differently depending on which page the user is standing on is a worse defect
than the jank it would avoid.

Both layers are still plain CSS transitions, so the global
`prefers-reduced-motion` block in `globals.css` clamps them. Never animate the
collapse with anything that block cannot reach, and never move it back onto a
layout property. Full measurements: `docs/ADDENDA_LOG.md` § 2026-08-17 —
sidebar collapse: a transform-based overlaid rail.

**Colour alone is never the active-nav signal.** Every `NavItem` layout also
paints a solid `--accent` marker bar — down the leading edge for `row`/`rail`,
across the top edge for `tab`. In the rail there is no label to carry a weight
change, and a hue shift on a 20px icon is not an unambiguous answer to "which
page am I on".

Collapsed, each item keeps its label as an `sr-only` span *and* gets a Radix
`Tooltip` that fires on hover **and** on keyboard focus. A `title` attribute
would not do the second.

### 5. Mobile is not a collapsed sidebar

**The breakpoint is Tailwind `md` (768px).**

Below it the sidebar is not displayed in either collapse state, and navigation
is a fixed **bottom tab bar**: Today / Pipeline / Contacts / More. "More" opens
a bottom `Sheet` holding the secondary items — Import, Settings, the theme
choices, Help, sign out — plus the workspace name and the signed-in email.

- **Never both.** `hidden md:block` on the sidebar (and the same on its in-flow
  spacer, so neither occupies space below `md`) and `md:hidden` on the tab bar
  make them mutually exclusive at every width. `display: none` removes a subtree
  from the accessibility tree and the tab order, so a phone has exactly one
  navigation landmark and one set of focusable nav links. Verified at 375px on
  2026-08-17: the sidebar's `<nav>` is inside the hidden subtree and only the
  tab bar's landmark is live.
- This is CSS, not a JS media query, deliberately. A viewport check cannot run
  on the server, so a JS-gated sidebar would render on a phone's first paint and
  unmount a frame later — the exact flash the collapse cookie exists to avoid.
  The tradeoff is that the sidebar markup is still present (though never
  rendered) in mobile HTML.
- **Navigation comes before content in the DOM**, even though the bar paints at
  the bottom. It is `position: fixed`, so source order costs nothing visually,
  and tab order then matches desktop: nav → header → content.
- **No hamburger.** The tab bar is primary navigation; "More" holds only
  secondary items.
- Mobile is **triage-first** — optimised for viewing, starring, calling and
  quick status changes. Full CRUD stays reachable but is not what the three
  primary slots are tuned for.

### 6. Org switcher: slot reserved, switcher not built

`WorkspaceBlock` renders the mark and the org name as **static content**. There
is no persisted "active org" concept in the schema, so a switcher is a feature
with a migration behind it, not a menu. The component takes the shape a trigger
will need — one row, mark and name inside it — so it can later become a
`DropdownMenuTrigger` without restructuring the sidebar. Do not add switching
behaviour, a route, a column or a query ahead of that decision.

### Shell primitives

Four parts were added to `src/components/ui/` for this, each with a live
consumer: `dropdown-menu.tsx` (identity menu), `sheet.tsx` (mobile More,
bottom-edge only), `tooltip.tsx` (collapsed rail labels) and `OptionRow.tsx`
(command-palette rows). All follow the alert-dialog/dialog/popover recipe.
Elevation: dropdown and tooltip are **Level 1**, the sheet is **Level 2** —
it dims the page and traps focus, so it is a modal in every sense the ramp
cares about.

**`outline-none` is not copied onto a menu row, and that is deliberate.**
shadcn's `DropdownMenuItem` ships with it; this app's does not. The class
deletes the global `:focus-visible` rule in `globals.css` for every row, leaving
`focus:bg-canvas-soft` — a `canvas-soft` tint on `canvas-pure` — as the only
signal, which is close to invisible on the dark canvas and is exactly where five
keyboard-driven controls now live. Dropping it does not make the menu noisy
under a mouse: Radix highlights a row by calling `.focus()` on `pointermove`,
and Chromium only matches `:focus-visible` on a programmatic focus when the last
real input was a keyboard. `DropdownMenuContent` keeps `outline-none` — it is
focused programmatically on open and should not ring.

`OptionRow` is a `div role="option"`, **not** a button. In the combobox pattern
the palette input keeps DOM focus throughout and names the highlighted row with
`aria-activedescendant`; focusable rows would put eight extra tab stops between
the query field and everything after it.


---

## Brand Identity — "Converging Funnel" (2026-08-14)

The CRM has its own mark, separate from the TEKGUYZ agency logo that serves
`tekguyz.com`. The agency mark represents the company; the CRM is a
multi-tenant product other organisations log into. Using one for the other was
a placeholder, and it is now retired from this app.

### The mark
An inverted funnel with a filled reservoir, fed by three hexagonal nodes whose
paths converge into a single downward arrow. Lead sources → qualification →
one pipeline. Concept generated externally, re-authored as vector here.

### Palette

| Role | Light | Dark | Notes |
|---|---|---|---|
| Logo ink | `#1A1A1A` | `#F5F5F5` | Carries the mark's entire structure — see the two-variant rule |
| Logo blue (reservoir) | `#3B6FE0` | `#3B6FE0` | `oklch(0.569 0.181 263.2)` |
| Logo teal (nodes) | `#2FA679` | `#16976B` | Darkened on dark; against the near-white casing `#2FA679` measures only 2.81:1 |
| Wordmark subtitle | `#6B6B72` | `#9A9AA2` | 5.07:1 / 5.83:1 |

Logo colours are **not** UI tokens and are never consumed by a component. The
mark is exempt from WCAG 1.4.11 as a logotype; the values above nonetheless
clear 3:1 at every internal adjacency, because a mark whose outline dissolves
is a bad mark regardless of what the spec requires.

### Two hard rules

**1. Two colour variants, chosen by theme — never a CSS filter.** The mark's
structure is carried entirely by its ink outlines. On `--canvas-soft` dark
(`oklch(0.14 0.004 260)`) the default `#1A1A1A` outlines vanish and the mark
collapses into disconnected blue and green shapes. Dark surfaces must use
`icon-on-dark.svg` / `lockup-*-dark.svg`. `filter: invert()` also flips the
blue and teal and is never acceptable.

**2. Reduced variant below 40px.** Three nodes, a cased Y-junction and an
arrowhead inside a funnel cannot resolve at favicon scale. `icon-reduced.svg`
(funnel + arrow, no nodes, 1.25× stroke) is the mark at ≤32px; the full mark
is used at 48px and above. This is a responsive logo, not two logos.

### Typography
Wordmark is Inter — Bold 700 for `TEKGUYZ` at 0.025em tracking, Medium 500 for
`CRM` at 0.16em. Same family as the app, so the mark and the UI read as one
product.

**All wordmark text is converted to SVG `<path>` outlines.** A logo carrying a
live `<text font-family="Inter">` element renders correctly inside the app and
silently falls back to a system stack everywhere else — email signatures,
decks, a client's machine. `scripts/brand/build_brand.py` does the conversion
from the real Inter TTF at build time.

### Asset pipeline
`scripts/brand/build_brand.py` is the single source of truth. Geometry, SVG
emitters, the wordmark outliner and the rasteriser all live in that one file,
so vector and raster cannot drift. No brand asset is ever hand-edited — fix
the script and re-run:

```
pip install pillow fonttools
npm i -D @fontsource/inter
python3 scripts/brand/build_brand.py \
  --inter-bold   node_modules/@fontsource/inter/files/inter-latin-700-normal.woff \
  --inter-medium node_modules/@fontsource/inter/files/inter-latin-500-normal.woff \
  --out public
```

---

## `--accent` — SAMPLED AND CLOSED (2026-08-14)

This is the derivation behind the Color Tokens table above, which was updated
in the same pass.

The mark's blue `#3B6FE0` is `oklch(0.569 0.181 263.2)`. Hue **263** already
sits inside the hue-260 cool-neutral family v2 specified, so brand and system
agree without either side compromising.

The raw brand blue is **not** the token. At L 0.569 it measures 4.44:1 against
the light canvas — a WCAG AA failure for text, and `CLAUDE.md` assigns
`--accent` to inline navigational links. One lightness step down, hue and
chroma locked to the logo:

| Token | Light | Dark |
|---|---|---|
| `--accent` | `oklch(0.53 0.181 263.2)` → `#3063D3` | `oklch(0.70 0.155 263.2)` → `#6A9BFE` |

Measured (see `docs/ADDENDA_LOG.md` for the full audit):

| Pairing | Ratio | Verdict |
|---|---|---|
| accent light, link text on canvas | 5.22:1 | AA |
| accent light, link text on card | 5.45:1 | AA |
| `--accent-fg` white on accent-light button | 5.45:1 | AA |
| accent dark, link text on canvas | 5.99:1 | AA |
| accent dark, link text on card | 5.49:1 | AA |
| `--accent-fg` ink on accent-dark button | 6.54:1 | AA |
| focus ring, both themes | ≥5.22:1 | AA (3:1 UI) |

The previous dark placeholder `oklch(0.62 0.15 260)` measured 4.23:1 against
the dark canvas — marginal. The value above also fixes that.

`#3B6FE0` remains the logo blue. The logo is not a UI control and is not held
to text contrast.
