# TEKGUYZ CRM: ADDENDA LOG — index

This file was a single 419 KB document until 2026-08-18. It is now an **index**;
the entries live in `docs/addenda/`. The path and the citation style did not change,
so every existing ``docs/ADDENDA_LOG.md § <Section Title>`` pointer in `CLAUDE.md`,
`docs/KNOWN_GAPS.md`, `docs/SCHEMA_REFERENCE.md`, `docs/DESIGN.md`, the handoff skill
and three source files still resolves — look the title up in the table below and open
the file it names. **55 such pointers existed at the time of the split and all 55 were
re-verified against this index afterwards.**

**Adding a new addendum:** append a dated `## <Title> (YYYY-MM-DD)` section to the
month file in `docs/addenda/`, then add its row to the table below. A section that is
not in this table is unreachable by every cross-reference in the repo.

Originally moved verbatim out of `CLAUDE.md` during the 2026-07-26 restructure (see that file's Reference Index). Every addendum section is still unedited — same wording, same headers, same order — and the 2026-08-18 split moved bytes between files without changing one of them. Consult the index before touching credentials/vault/webhook code specifically, or whenever asked to explain why a past decision was made.

**Note on Prompt 7:** there is no standalone "Prompt 7 addendum" section anywhere in the log. The only Prompt 7 addendum that exists is schema-specific (the `activity_logs` table applied via Supabase MCP) and lives in `docs/SCHEMA_REFERENCE.md` instead, immediately after the SQL block it documents — that is where it sat in the original file too (inside Section 2, not as its own `##` heading). Flagged here rather than silently duplicated, per this project's own "flag drift, don't paper over it" discipline.

**Note on Known Gaps:** the full, unabridged historical text of every Known Gaps bullet (before the 2026-07-26 rewrite compressed them to one-line dispositions) is preserved under "Known Gaps — Full Historical Record", and every item resolved (✅) since 2026-07-30 relocates to "Known Gaps — Resolved Items Archive" in the same one-line format it had in `CLAUDE.md`. Both now live in [`docs/addenda/archives.md`](addenda/archives.md), not at the bottom of this file.

---

## Where the entries live

| Part | File | Sections |
|---|---|---|
| Build-era addenda (Prompts 11–15b) and the closed 15-phase roadmap | [`docs/addenda/prompts-1-15.md`](addenda/prompts-1-15.md) | 8 |
| Dated addenda — July 2026 | [`docs/addenda/2026-07.md`](addenda/2026-07.md) | 26 |
| Dated addenda — August 2026 | [`docs/addenda/2026-08.md`](addenda/2026-08.md) | 31 |
| Archives — Known Gaps history and CLAUDE.md compressions | [`docs/addenda/archives.md`](addenda/archives.md) | 3 |

---

## Every section, and where it now lives

Listed in original document order. Titles are verbatim — a `§` pointer anywhere in the
repo matches a title in this column.

| § Section title | File |
|---|---|
| Prompt 11 addendum (Hardened Webhook Ingestion Route) | [`docs/addenda/prompts-1-15.md`](addenda/prompts-1-15.md) |
| Prompt 12 addendum (AI Spam Shield & Resend Notification Dispatch) | [`docs/addenda/prompts-1-15.md`](addenda/prompts-1-15.md) |
| Prompt 13 addendum (BYO API Key Settings & Voice Memo Capture) | [`docs/addenda/prompts-1-15.md`](addenda/prompts-1-15.md) |
| Prompt 13a addendum (Vault-Encrypted BYO API Key Configuration) | [`docs/addenda/prompts-1-15.md`](addenda/prompts-1-15.md) |
| Prompt 14 addendum (Weekly Executive Revenue Report Cron) | [`docs/addenda/prompts-1-15.md`](addenda/prompts-1-15.md) |
| Prompt 15a addendum (Production Infrastructure Hardening) | [`docs/addenda/prompts-1-15.md`](addenda/prompts-1-15.md) |
| Prompt 15b addendum (UI Resilience & Final Go-Live Triage) | [`docs/addenda/prompts-1-15.md`](addenda/prompts-1-15.md) |
| Production Gaps Sweep addendum (2026-07-24) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Password Reset Flow addendum (2026-07-25) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Signup-confirmation live-email re-check attempt (2026-07-25, later same day) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| TEKGUYZ Demo Seed Data (2026-07-25) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Settings & Configuration Inventory (audited 2026-07-25) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Theme Toggle addendum (2026-07-25) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| P0 Fixes & Password Visibility addendum (2026-07-25) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| AlertDialog & Toast addendum (2026-07-25) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Prompt 9 addendum — CSV Import Wizard, Part 1: Upload & Column Mapping (2026-07-25) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Prompt 10 addendum — CSV Import Wizard, Part 2: Validation & Batch Insert (2026-07-26) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Case-Insensitive Email Constraint addendum (2026-07-26) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Webhook Email Normalization addendum (2026-07-26) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Email Case-Insensitivity: Full Fix addendum (2026-07-26) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Webhook Rotation, Clear-Key, and Locale Options addendum (2026-07-27) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Account Panel: Password, Display Name, Notification Preferences addendum (2026-07-27) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Lead Field Completion addendum (2026-07-27) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Task/Calendar addendum — Prompts 1 & 2: `tasks` schema + Profile Sheet TasksSection (2026-07-28) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Task/Calendar addendum — Prompt 3: Today's Agenda "Tasks Due" section (2026-07-28) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Task/Calendar addendum — Prompt 4: auto-close tasks on lead archive (2026-07-28) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Task/Calendar addendum — Prompt 5: hardening pass (2026-07-28) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| EditLeadModal split addendum (2026-07-28) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Silent NULL-on-save data-loss bug: website / lead_source / service_category (2026-07-30) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Server Action field-parity audit — full sweep (2026-07-30) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Help Drawer addendum — Prompt 1: `ui/dialog.tsx`, static content, Header trigger (2026-07-30) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Help Drawer addendum — Prompt 2: inline tooltips at 3 anchors + context lift (2026-07-30) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| updateOrgSettings silent-RLS-no-op fix (2026-07-30) | [`docs/addenda/2026-07.md`](addenda/2026-07.md) |
| Spam Shield routing fix — flagged leads stay visible and still notify (2026-08-11) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Webhook secret exposure audit (2026-08-11) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Design System v2 "Structural Neutral" — foundation layer (2026-08-14) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Archived: 15-Phase Technical Roadmap (initial build, closed) | [`docs/addenda/prompts-1-15.md`](addenda/prompts-1-15.md) |
| Design System v2 — Prompt 2a: Shell, Today's Agenda, Pipeline (2026-08-15) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Design System v2 — Prompt 2b: Contacts, Profile Sheet, Modals, CSV Wizard, Needs Review (2026-08-15) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| CLAUDE.md compression history | [`docs/addenda/archives.md`](addenda/archives.md) |
| Known Gaps — Full Historical Record | [`docs/addenda/archives.md`](addenda/archives.md) |
| Primitive audit — `src/components/ui/` coverage, the primitive-source rule, `Checkbox`, `Button asChild` (2026-08-16) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Design System v2 — pre-auth surfaces, error/loading boundaries, and the last two raw checkboxes (2026-08-16) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| `--cold-fg`: making `Badge`'s cold tone AA-readable (2026-08-17) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| 2026-08-17 — a regression test for the focus-ring floor | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Known Gaps — Resolved Items Archive | [`docs/addenda/archives.md`](addenda/archives.md) |
| Design System v2 — by-eye verification pass and two real fixes (2026-08-14, later same day) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Leads MEMBER-role enforcement addendum (2026-08-14) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Brand identity + `--accent` sampling — 2026-08-14 | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Brand application pass — 2026-08-15 | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Metadata & doc cleanup pass — 2026-08-15 | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Dev-only sign-in route for browser verification (2026-08-15) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| CSV import chunk-write RPC — `import_leads_chunk` (2026-08-15) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Doc-vs-doc contradiction repair, and the handoff check that now catches it (2026-08-15) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Design System v2 — Prompt 2c (2026-08-15) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Accepted invites stuck at PENDING — Settings → Team (2026-08-16) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Application shell redesign — sidebar, header, mobile navigation (2026-08-16) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| Shell redesign close-out: cookie audit, collapse animation, focus ring (2026-08-16) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| CLAUDE.md restructure: § 3 to a table, duplicated values to pointers (2026-08-16) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| CLAUDE.md restructure follow-up: three rules restored, one count fixed (2026-08-16) | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| 2026-08-16 — Wave decisions | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| 2026-08-17 — `lead_submissions`: the immutable enquiry log | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| 2026-08-17 — `OptionRow`: a leading marker bar, not a tint alone | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| 2026-08-17 — sidebar collapse: a transform-based overlaid rail | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| 2026-08-17 — Closing a stranded PENDING invite on membership insert | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| 2026-08-17 — OG route: Inter vendored out of `node_modules` | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| 2026-08-17 — Deterministic org resolution, and hiding lifecycle controls from a MEMBER | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
| 2026-08-18 — handoff check 10: assertion drift | [`docs/addenda/2026-08.md`](addenda/2026-08.md) |
