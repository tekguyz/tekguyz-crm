# TEKGUYZ CRM: TECHNICAL ARCHITECTURE & MASTER SCHEMA

## Reference Index

- **This file:** permanent rules only — the design system, operational rules, the multi-tenant security model, post-launch initiative status, and the standing disciplines. Edit it only when a permanent rule or pattern changes.
- **`docs/SCHEMA_REFERENCE.md`:** the live database schema — every table, RLS policy with its paired `WITH CHECK`, `SECURITY DEFINER` RPC, and index. Read before any migration, RLS, or RPC work.
- **`docs/ADDENDA_LOG.md`:** dated build history and the full story behind past decisions. New addenda go here, not in this file.
- **`docs/KNOWN_GAPS.md`:** deliberately deferred work.

---

## 1. CORE MECHANICS & ARCHITECTURE

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
- **Any new `text-*` role must be registered in `src/lib/utils/cn.ts`.** tailwind-merge's stock config has never seen these names, so it files them under text-COLOUR and treats a role as conflicting with a colour: `cn("text-accent-fg", "text-body-md")` silently returns only `text-body-md` and the foreground colour vanishes with no error. `cn.ts` registers all eight as a `font-size` group; extend that list, never work around it at the call site.
- **`globals.css` uses `@theme inline`, and that is load-bearing — do not revert it to a plain `@theme`.** A plain `@theme` emits `--color-x: var(--x)` on `:root`, so the indirection resolves at `:root` and only the already-resolved colour inherits down — a nested `.light`/`.dark` wrapper can never re-theme its own subtree (both `/design` panes rendered identically). `inline` puts the reference in the utility itself, so the lookup happens on the element being painted.
- **Level 0 (hairline, no shadow) is the default** for buttons, cards, inputs and table rows. Level 1 is popovers and dropdowns only; Level 2 is modals and the command palette only. Dark mode runs ~3x the light alpha at each stop — keep that ratio if the ramps are retuned.
- **Global focus rule gotcha:** any `:not()` must stay a single `:not()` with a comma-separated list. Chaining `:not(a):not(b)` silently fails to compile under this project's Lightning CSS/Turbopack pipeline — no error, just no focus styling.
- **Going Cold SLA rule:** when a lead's `next_action_at` is overdue, its card border becomes a dashed `--cold` line and its status badge desaturates. This is `Card`'s `cold` prop and `Badge`'s `cold` tone. It is business signal — never repurpose either for styling.
- **Icons are `@tabler/icons-react`, outline only,** stroke 1.75–2, `size-5` in dense contexts and `size-6` in spacious ones. `lucide-react` was fully removed on 2026-08-14.
- **The font variable belongs on `<html>`, not `<body>`.** Tailwind's preflight applies `font-family: var(--font-sans)` at the html level and `--font-sans` resolves to `var(--font-inter)`, so a next/font variable declared on `<body>` is out of reach and the whole app silently falls back to the system stack with no error.

### High-Leverage Operational Utilities
- **Click-to-Action Real-Time Shortcuts:** Every phone number dynamically renders with `tel:` and `sms:` protocols. Every email compiles a `mailto:` redirect wrapper, and physical addresses point directly to Google Maps URL parameters for single-tap field execution.
- **Resurrection Engine:** No hard deletions are permitted; deletions toggle the `archived` boolean flag. If an archived client submits an inbound webhook form, the system resurrects the profile, shifts its status to NEW, and flags it with a `[Returned Prospect]` UI indicator.
- **A classifier verdict ROUTES a lead, it never hides one (permanent rule, 2026-08-11).** No automated judgement — spam shield today, anything scored later — may set `archived`, and none may gate the new-lead notification. `archived` means "a human removed this"; overloading it with "a model doubted this" cost 12 real leads five days of silent invisibility, because every list query filters `archived = false` *and* the notification was suppressed by the same verdict, so nobody could review a queue they were never told existed. A verdict routes to a review surface and always notifies. Full history: `docs/ADDENDA_LOG.md` § Spam Shield routing fix.
- **Kanban Reorder Rule:** Same-column drag does NOT persist a manual order; column order stays driven by existing field logic (SLA date / revenue / starred). Only cross-column drag persists, and only changes `status`.
- **Contacts Directory Scope:** The Contacts directory shows all non-archived leads regardless of `outcome` (WON/LOST/ABANDONED all remain visible) — deliberately different from Pipeline views, which filter to active work only. `archived` is the only visibility lever for Contacts; `outcome` is never used to hide a contact. Reasoning: WON leads become paying clients and need to stay reachable; LOST/ABANDONED may get re-engaged later; a directory's job is different from a pipeline's job. If clutter becomes a real problem, the fix is better search (Prompt 8's command palette), not blanket suppression of real data.

### Multi-Tenant Security Model
Following a Principal Architect audit of the original schema, five structural gaps were identified and closed. These are now permanent architectural law, not optional hardening:

1. **Membership-based tenant resolution.** A user's access to an organization is never assumed or hardcoded — it's resolved through an `organization_members` table (user_id ↔ organization_id ↔ role). RLS policies call a `SECURITY DEFINER` helper, `private.current_org_ids()`, rather than referencing a literal UUID or tautological condition. (Lives in a dedicated `private` schema, never added to the API-exposed schema list, rather than `auth` — hosted Supabase does not allow creating objects in the `auth` schema itself.)
2. **RLS with paired `WITH CHECK` clauses.** Every write policy validates both the row being touched (`USING`) and the row being written (`WITH CHECK`), preventing a request from reassigning a row into a different tenant's scope.
3. **Access-controlled credentials, service-role only, encrypted at rest via Supabase Vault (as of Prompt 13a).** BYO LLM/integration keys and tokens live in a dedicated `organization_credentials` table with `anon` and `authenticated` grants fully revoked and zero RLS policies, so service-role (used only from Server Actions) is the sole path in — but the table itself no longer stores the secret value at all. Prompt 13's plaintext `TEXT` columns (confirmed empty, zero rows ever written) were replaced in Prompt 13a with nullable `UUID` columns (`*_secret_id`) pointing into `vault.secrets`; the real value only ever exists inside Supabase Vault, reachable exclusively through two `SECURITY DEFINER` RPCs (`vault_set_org_credential`, `authenticated`-gated with an internal OWNER/ADMIN role check; `vault_get_org_credential`, `service_role`-gated only). Verified live: the `authenticated` role's own attempt to call `vault_get_org_credential` fails with "permission denied," and the stored column value is a UUID, never the raw key. This is now real encryption, not just access control — re-verify against the live schema before describing it any other way, since this doc has been wrong about it before (see the Prompt 12/13 addenda in `docs/ADDENDA_LOG.md`, both superseded by Prompt 13a).
4. **Per-tenant webhook secret.** `organizations.webhook_secret` is a unique, server-generated, rotatable token that resolves inbound webhook traffic to the correct tenant. The ingestion route is tenant-scoped by this secret, never by a payload-supplied `organization_id`.
5. **Explicit revenue/outcome tracking.** `leads` carries `outcome` (WON / LOST / ABANDONED), `closed_at`, and `actual_revenue`, so the analytics cron can distinguish realized revenue from abandoned or lost pipeline — rather than inferring outcome from the `archived` flag alone.

**Role enforcement status** (`organization_members.role`: OWNER/ADMIN/MEMBER) — partial, kept accurate here so it doesn't get assumed complete: enforced at RLS for `organization_invites` (create/revoke, OWNER/ADMIN only), the `organizations` UPDATE policy (OWNER/ADMIN only), and the `get_org_webhook_secret` RPC (OWNER/ADMIN only, re-checks the caller's own role for the specific `org_id` requested — never trusts a client-supplied `org_id` alone). **NOT enforced anywhere on `leads`** — any member has full CRUD parity regardless of role. Sensitive per-row data (`webhook_secret`, invite tokens) is gated at the fetch level, not just conditionally rendered — a value that never should reach a MEMBER is never queried for one, since anything passed as a prop to a client component ships in the RSC payload regardless of whether it's visually rendered.

---

## 2. Build History

The initial build was a closed 15-phase roadmap (Prompts 1–15), complete. Full
list and per-prompt narrative: `docs/ADDENDA_LOG.md` § Archived: 15-Phase
Technical Roadmap. Do not add new prompts to it — a new feature gets its own
initiative in § 3.

---

## 3. Post-Launch Feature Work

Each initiative below is tracked as its own named, numbered prompt sequence — not a continuation of the 15-phase roadmap in § 2, which is closed. Full build narrative for every shipped prompt lives in `docs/ADDENDA_LOG.md`; this list is just current status.

- **Task/Calendar (4 prompts + a hardening pass).** ✅ **Complete, all shipped 2026-07-28.** A `tasks` table (RLS mirroring `leads`' no-role-enforcement shape), a `TasksSection` in the Profile Sheet, an org-wide `TasksDueQueue` on Today's Agenda, and auto-close of a lead's open tasks when it's archived. Deliberate v1 non-goals, so they don't get assumed done: no `assigned_to`, no task edit/delete, no calendar view, and unarchiving does **not** reopen auto-closed tasks. Full history: `docs/ADDENDA_LOG.md` § Task/Calendar addendum — Prompts 1 & 2, § Prompt 3, § Prompt 4, § Prompt 5.
- **Help System (2 prompts).** ✅ **Complete, both shipped 2026-07-30.** A searchable help drawer over three hardcoded topics in a static `src/lib/help/content.ts`, opened either from the Header `?` or from three inline `HelpTooltip` anchors, with drawer state in a `HelpProvider` Context mounted once in `AppShell`. Zero Server Actions, no schema change. Added `@radix-ui/react-dialog` and `@radix-ui/react-popover` — `src/components/ui/` now holds three consistent Radix overlay primitives (alert-dialog, dialog, popover), so follow that same recipe for any future one. Full history: `docs/ADDENDA_LOG.md` § Help Drawer addendum — Prompt 1, § Prompt 2.

---

## Build discipline
Finish and verify one unit before starting the next. Never generate ahead of
what has been verified. "Verified" means the thing was actually run — dev server,
test, or browser — not that it compiled. If a unit includes a migration, apply it
to the real Supabase project and confirm it before continuing.

## Form/Action Field Parity (permanent rule)
**Every column a Server Action writes from `formData.get("x")` must have a rendered `<input name="x">` in the form posting to it.** An absent field yields `null`, so a written-but-unrendered column is silently NULLed on every save — no error, invisible until the data is gone. Hit five `leads` columns across two incidents (2026-07-27, 2026-07-30). Defaults are worse than `|| null`, not better: `?? "UTC"` / `?? "NEW"` silently *reset* a column and pass validation, since the default is itself valid.
Whenever a form or its action changes, diff the form's `name=` set against the action's `formData.get()` set (both directions empty). For a form split across siblings, diff the shell **plus every sibling** — no single file shows the field set. Full audit + exact commands: `docs/ADDENDA_LOG.md` § Server Action field-parity audit.

## Session & Verification Discipline
- **Never assume a prior instruction landed without checking actual code/file state.** A past conversation, a memory, or a claim in chat is not evidence that code exists — read the file. If asked to confirm behavior, show the real current code/output, not a recollection of intent.
- **Maintain the Known Gaps section for anything intentionally deferred.** If a limitation, missing enforcement, or scoped-out edge case is accepted on purpose (not just forgotten), it gets a bullet there so it doesn't silently get assumed complete in a later session.
- **When a Known Gaps item flips from ⬜ to ✅, relocate its one-liner out of this file into `docs/ADDENDA_LOG.md` § "Known Gaps — Resolved Items Archive" in that same session** — don't leave a resolved item inline "to clean up later." Deferred cleanup is exactly what let this section regrow to the point of needing two separate compression passes; make relocation part of closing the gap, not a follow-up task.
- **Build the current unit in isolation unless the roadmap already documents a shared requirement.** Build shared infrastructure ahead of time only when this file's own roadmap text explicitly calls for the sharing (e.g. Prompt 5's data adapter, shared with Prompt 4's Kanban); anticipating an unstated future consumer is scope creep.
- **A scripted click on a state-changing button can report success while doing nothing.** Cross-check any such result against the network tab or the DOM before trusting it. The current Browser pane tools are `computer` (real pointer and keyboard), `read_page`, `read_network_requests`, and `javascript_tool`; a direct `button.click()` via `javascript_tool` is the reliable fallback when a synthetic click no-ops.
- **If `document.visibilityState` reads `"hidden"`, the whole app can fail to respond to any click, not just the component under test.** Before debugging new code, test an already-shipped control the same way — if it also fails, this is environmental, so fall back to scripted verification instead of fighting the browser tool. Full symptoms: `docs/ADDENDA_LOG.md` § Silent NULL-on-save data-loss bug.
- **In that same non-compositing state, geometry assertions pass VACUOUSLY against zeros.** React 19 gates its suspense reveal on `requestAnimationFrame`, which never fires when the pane does not composite, so the content stays parked in `<div hidden id="S:0">` holders and every `getBoundingClientRect()` returns 0x0 — a padding or size check "passes" while measuring nothing. Remove the `hidden` attribute on those holders before measuring, or the numbers are meaningless. Computed colour/style reads are reliable without the unhide.
- **A controlled Radix overlay whose trigger lives outside its `Root` does not return focus to that trigger on close.** When the trigger can't live inside the `Root` (e.g. one overlay in `AppShell` opened from several places), capture `document.activeElement` at open time and restore it in `onCloseAutoFocus` via `preventDefault()` + `.focus()`, guarded by `isConnected`. Test focus return with the trigger **genuinely focused first** — a programmatic `.click()` never focuses — and assert on `document.activeElement` directly. Full history: `docs/ADDENDA_LOG.md` § Help Drawer addendum — Prompt 1, § Prompt 2.
- **A dispatched synthetic `mouseover`/`mouseenter` does not fire React's `onMouseEnter`.** Test hover-driven UI with a real pointer (`computer{action:"hover"}`) or through its click path. Related: the Browser pane's screenshot-to-viewport coordinate scale drifts as the pane resizes, so derive it fresh from a known element's `getBoundingClientRect()` each time.
- **Update CLAUDE.md proactively, without being asked,** whenever a durable architectural decision, newly-discovered constraint, scope decision, or permanent verification habit is established. When unsure whether something is durable enough, leave it out — this file has needed two emergency compressions, and "log it when unsure" is what filled it. If it turns out to matter, it will come up again and can be logged then. **New dated addenda go to `docs/ADDENDA_LOG.md`, not this file**; edit this one only for a permanent rule/pattern change or a Known Gaps disposition update.
- **Supabase MCP tool-access rule:** read-only MCP tools (`list_tables`, `get_advisors`, `execute_sql` for SELECT only) may be used freely for self-verification. Anything that writes schema (`apply_migration`, any DDL) must never be called directly — write the migration SQL file and hand it to the human. The one standing exception is the `vault` schema, which has no client-facing surface at all (see `docs/ADDENDA_LOG.md` § Prompt 13a addendum); it does **not** extend to any `public`-schema table, which must go through the app's own service-role key per Prompt 11's pattern. **This has been broken once already** (§ Lead Field Completion addendum, 2026-07-27) — before reaching for `execute_sql` to write or restore any `public`-schema row, stop and use a disposable script instead.

## Known Gaps
Deliberately deferred work lives in `docs/KNOWN_GAPS.md`, including the rules
for maintaining it. Read it before assuming any limitation is already handled.
