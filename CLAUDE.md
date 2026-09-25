# TEKGUYZ CRM: TECHNICAL ARCHITECTURE & MASTER SCHEMA

A multi-tenant Next.js/Supabase sales CRM. Tenant isolation runs through
Postgres RLS, not application code, so anything touching `leads`,
`organizations`, `organization_members`, `prospects` or credentials has a real
security surface. `main` auto-deploys to Vercel — "pushed" is not "deployed"
until the deploy is confirmed.

**This file is permanent rules and pointers only.** It loads into every message.
Detail lives in `.claude/rules/` with `paths:` frontmatter (free until a matching
file is read) or in `docs/` (read on demand).

## Reference Index

| File | What it owns |
| --- | --- |
| `PRODUCT.md` | Product truth — users, purpose, positioning, principles (Impeccable reads it) |
| `DESIGN.md` | Design spec — token tables, elevation, iconography, § The Application Shell |
| `docs/SCHEMA_REFERENCE.md` | The live schema. Read before any migration, RLS or RPC work |
| `docs/SECURITY_MODEL.md` | The seven security rules in full, and role-enforcement status |
| `docs/INITIATIVES.md` | Post-Launch Feature Work — initiative status, one row each |
| `docs/VERIFICATION.md` | Session/verification discipline and Test-Data Cleanup, in full |
| `docs/ADDENDA_LOG.md` | **Index** of dated history. Entries in `docs/addenda/`; a new addendum needs an index row |
| `docs/ROADMAP.md` | Not-yet-started initiatives and open product decisions |
| `docs/KNOWN_GAPS.md` | Deferred work, **and the single copy of the rules for maintaining it** |

Path-scoped detail, loaded only when a matching file is read:

| `.claude/rules/` | Covers |
| --- | --- |
| `design-system.md` | Primitives, tokens, focus, the shell |
| `brand-assets.md` | Brand pipeline, the mark, outward copy, crawler routes |
| `leads-and-ingestion.md` | Click-to-action, Resurrection Engine, submissions, promotion |
| `forms.md` | Field parity and the React 19 form reset |
| `nextjs-patterns.md` | `use server` / `use client` exports, dev routes, redirect remount |

**There is deliberately no `STATUS.md`.** Status is split by responsibility —
`docs/INITIATIVES.md`, `docs/ADDENDA_LOG.md`, `docs/KNOWN_GAPS.md`. Consolidating
them is what produced this file's compressions; do not create one.

## Authority order

When two documents disagree, the higher one wins and the lower one gets fixed —
never silently pick one.

1. **The live thing** — the database, `src/app/globals.css`, the running app. A
   doc is not a measurement.
2. **This file** — permanent rules. Where a skill's generic advice conflicts
   with a rule here, this file wins.
3. **`docs/SCHEMA_REFERENCE.md`, `DESIGN.md`, `docs/SECURITY_MODEL.md`** —
   the reference docs.
4. **`docs/ADDENDA_LOG.md`** — dated history. Explains why; never overrides.

## Hard rules

These are never moved to a path-scoped file, because a path-scoped file does not
load when it matters.

- **Never `execute_sql` a write against a `public`-schema table.** Read-only
  Supabase MCP tools (`list_tables`, `get_advisors`, `execute_sql` for SELECT
  only) may be used freely. Anything that writes schema (`apply_migration`, any
  DDL) is never called directly — write the migration SQL file and hand it to
  the human. The one standing exception is the `vault` schema. This has been
  broken once already. Detail: `docs/VERIFICATION.md`.
- **Removal of test data is a database-level operation, and `archived` is not
  removal.** Anything created to verify something is part of that unit of work
  and is removed before the unit is reported done. Full rule:
  `docs/VERIFICATION.md` § Test-Data Cleanup.
- **Secrets live in the git-ignored `.env` / `.env.local` and in Vercel's env
  settings.** Never commit one, never paste one into a doc, and never tell the
  founder to put one in a Windows user environment variable. BYO tenant
  credentials live in Supabase Vault, never in a `public` column —
  `docs/SECURITY_MODEL.md` rule 3.
- **Every column a Server Action writes from `formData.get("x")` must have a
  rendered `<input name="x">` in the form posting to it**, and that form must
  use controlled fields, not `defaultValue`. An absent field silently NULLs a
  column. Full rule, and the `<select>`/`Checkbox` reset trap:
  `.claude/rules/forms.md`.
- **A classifier verdict ROUTES a lead, it never hides one.** No automated
  judgement may set `archived` or gate the new-lead notification.
- **An inbound resubmission never rewrites a `leads` identity column.** Detail:
  `.claude/rules/leads-and-ingestion.md`.
- **Adding a column to `LEAD_COLUMNS` is never additive — the migration lands
  before the code.** PostgREST errors `42703` on a column the database does not
  have, taking down every lead surface and inbound webhook capture at once.
- **Account creation is invite-only, and the gate lives in the Server Action.**
  `docs/SECURITY_MODEL.md` rule 7.
- **Session verification on a render path is `getClaims()`, never `getUser()` —
  and never `getSession()`.** `docs/SECURITY_MODEL.md` rule 6.
- **Never invent a business fact, and never write a placeholder phone number.**
- **Never edit a file in `public/brand/` or `public/icons/` by hand** — they are
  generated by `scripts/brand/build_brand.py` and the next run reverts the edit.
- **The webhook signing protocol is shared with `C:/Projects/tekguyz-site`.** Any
  change to it ships in both repos, deployed back to back.
- **Never assume a prior instruction landed.** A past conversation, a memory or a
  claim in chat is not evidence that code exists — read the file.
- **Report what you did not finish.** Never describe unfinished work as complete.

## Multi-tenant security model

Seven rules, permanent architectural law, in full in **`docs/SECURITY_MODEL.md`**:
membership-based tenant resolution; RLS with paired `WITH CHECK`;
service-role-only credentials in Supabase Vault; per-tenant HMAC webhook signing
with replay and rate-limit guards; explicit revenue/outcome tracking;
`getClaims()` on the render path; invite-only account creation. That file also
carries the role-enforcement status, which is **partial** — never assume it is
complete. Before any migration, RLS or RPC work, read `docs/SCHEMA_REFERENCE.md`.

## File size

Split files by responsibility, not by line count. **Around 200 lines is a smell
worth a second look, not a wall.** Never split a cohesive unit purely to get
under a number — a form split across siblings hides its own field set, and that
is how five `leads` columns were silently NULLed across two incidents.

## Design system

A dense, neutral, monochrome-first data tool. Structure comes from hairline
borders and spacing, not shadow. Colour is signal, not decoration.

- **`src/app/globals.css` is the single source of truth for every token value.**
  Read that file for values; a doc copy can only drift.
- **Consume primitives from `src/components/ui/`, never one-off classes.** A new
  one-off styled `<button>` is a bug, and a primitive is never hand-copied a
  second time.
- The live reference is the dev-only route `/design`.

Everything else — the three-step rule for a new UI element, `--accent`'s limits,
the radius and type scales, `cn.ts` registration, elevation, focus, the shell —
is in **`.claude/rules/design-system.md`** and **`DESIGN.md`**.

## Build discipline

Finish and verify one unit before starting the next. "Verified" means the thing
was actually run — dev server, test, or browser — not that it compiled. If a unit
includes a migration, apply it to the real Supabase project and confirm it first.

**Build the current unit in isolation** unless a documented roadmap item already
calls for the sharing. Anticipating an unstated future consumer is scope creep.

The App Router patterns that fail silently here — a `"use server"` file's
exports, a `"use client"` file's constants, a dev-only route's `notFound()`, a
redirect that remounts the page, the fixed render-path cost that reads as a
loading-skeleton flash — are in **`.claude/rules/nextjs-patterns.md`**.

## Session and verification discipline

Full text, including the browser-pane traps, `GET /api/dev-login`, the
migration dry-run rule, and the PowerShell-for-`.env` rule, is in
**`docs/VERIFICATION.md`**. The short version:

- Reach the signed-in app locally via `GET /api/dev-login`. It is a real
  sign-in, development-only.
- Dry-run every migration's SQL against a temp-table replica before handing the
  file to the human. The human applies all DDL.
- Any script that needs `.env` runs through the **PowerShell** tool, not Bash —
  Bash is sandboxed and cannot see `.env`.
- Deferred work is registered in `docs/KNOWN_GAPS.md`, which carries the only
  copy of the rules for maintaining it.
- **Update this file proactively** when a durable rule or constraint is
  established. When unsure whether something is durable, leave it out. New dated
  addenda go to `docs/addenda/` with an index row, never into this file.

Skills in use on this repo: `impeccable`, `vercel-react-best-practices`, and
`web-design-guidelines` — the last is used standalone, never in the same pass as
`impeccable`. None of them overrides this file.

## Gates

`npm run build` · `npm run lint` · `npm run typecheck` · `npm run test:unit` ·
`npm run test:integration` (any policy, grant, RPC or membership change; runs
serially) ·
`npm run check:docs` (design drift, doc figures, section pointers) ·
`npm run check:residue` (live test rows, SELECT-only, needs `.env`) ·
`npm run check:widths` (real-browser text width, for layout work).

Exit `0` clean · `1` findings · `2` could not run, which is **not** a pass.

**Never `npm test`.** It prints an error and exits `1` on purpose. CI runs
`typecheck`, `build` and `test:unit` on every PR (`.github/workflows/ci.yml`);
`test:integration` needs `.env` and runs locally only.

## Agent skills

### Issue tracker

New work goes to GitHub Issues (`gh` CLI). `docs/KNOWN_GAPS.md` and
`docs/ADDENDA_LOG.md` keep governing existing/deferred items per the rule above
— this doesn't replace that. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five: `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root, created lazily as
terms/decisions resolve. See `docs/agents/domain.md`.

### Repo skills

- `.claude/skills/status-sync/` — the cheap pass. Audits `docs/INITIATIVES.md`,
  `docs/ADDENDA_LOG.md`, `docs/KNOWN_GAPS.md` and `docs/SCHEMA_REFERENCE.md`
  from check-script output. It reports; it never pastes anything anywhere.
  Renamed from `handoff` 2026-09-20.
- `.claude/skills/doc-audit/` — the heavy pass. Measures the docs against the
  repo, repairs them, and commits.
