# TEKGUYZ CRM — Known Gaps

Relocated from CLAUDE.md on 2026-08-14. It is a register of deliberately
deferred work, not an instruction set, and it was the documented cause of both
CLAUDE.md compression passes.

## How to maintain this file

**This section is the single copy of the policy.** CLAUDE.md used to restate it
in two places; both are now one-line pointers here. Keep it that way.

- Anything intentionally deferred gets a bullet here — a limitation, a missing
  enforcement, or a scoped-out edge case accepted on purpose rather than
  forgotten — so it is never silently assumed complete in a later session. That
  includes a deliberate v1 non-goal of a shipped initiative: CLAUDE.md § 3
  records status only, never scope that was left out.
- Open items are ⬜, one to two sentences, with a date and a pointer to the full
  story in `docs/ADDENDA_LOG.md`.
- The moment an item is fully resolved, move its line to
  `docs/ADDENDA_LOG.md` § "Known Gaps — Resolved Items Archive" in that same
  session. Do not leave resolved items here "to clean up later" — deferred
  cleanup is exactly what let this register regrow to the point that CLAUDE.md
  needed two separate compression passes. Relocation is part of closing the
  gap, not a follow-up task.
- A ✅ shown beside a ⬜ means partially resolved with real open scope — the ✅
  half is context for why the ⬜ half is scoped as it is.
- An item with no date is stale. Re-triage it before relying on it.
- Full discovery narrative and historical context for every item — including the
  complete pre-2026-07-26 text of this register — lives in
  `docs/ADDENDA_LOG.md` § "Known Gaps — Full Historical Record", plus whichever
  addendum each individual bullet names.
- An item that was considered and **rejected outright** is not deferred work and
  does not belong under Open items. It goes in the subsection directly below,
  which overrides any older history that still reads as open.

### Permanently rejected — never re-list

A third disposition, distinct from both of the above. An **Open item** is work
deferred on purpose. A **Resolved** item is work that got done and moved to
`docs/ADDENDA_LOG.md` § "Known Gaps — Resolved Items Archive". An item here is
neither: it was considered and **rejected**, permanently. It is not deferred,
not partial, and not waiting on a trigger.

Dated mentions in `docs/ADDENDA_LOG.md` are left exactly as they are — they are
a correct record of what was true on their own date, and they are not the bug.
This list is what overrides them going forward. **When history reads as open and
this list says rejected, this list wins.**

- **Leaked Password Protection** — rejected 2026-07-22, paid Supabase tier only,
  this project stays on free tier indefinitely. Never list as open work or a
  "needs user" action in any handoff, regardless of what `docs/ADDENDA_LOG.md`
  history says. Its advisor lint (`auth_leaked_password_protection`, WARN) will
  keep firing on every live `get_advisors` run — that is expected, and it is not
  a finding. Its Open-items bullet was deleted on 2026-08-15; this entry replaces
  it so the deletion cannot be undone by a later reader of the history. Full
  history: `docs/ADDENDA_LOG.md` § Known Gaps — Full Historical Record
  (2026-07-22 triage) and the 2026-08-15 hygiene pass.

- **Every other Supabase Security Advisor lint this project reports** — rejected
  2026-08-18 after auditing all 14 against the live schema, not from the doc.
  **Expected output, not findings, and they will keep firing forever.** Two INFO
  `rls_enabled_no_policy` (`organization_credentials`, `report_sends`) are the
  *safest* possible state — RLS on with zero policies denies everything, and
  neither table grants anything to `anon`/`authenticated`; adding a policy to
  quiet the lint would make them less safe. Ten WARN
  `authenticated_security_definer_function_executable` describe this project's
  entire multi-tenant write model, which is deliberately built from
  `SECURITY DEFINER` RPCs; all ten were confirmed to re-check the caller inside
  their own bodies. One WARN `anon_security_definer_function_executable` on
  `get_invite_preview` is required — `/invite/[token]` renders before sign-in.
  Do not "fix", suppress, or re-investigate any of them; do not list them in a
  handoff. The only one that could ever change is leaked-password protection
  above, and only on a paid tier. Full audit: `docs/ADDENDA_LOG.md`
  § 2026-08-18 — Security Advisor: all 14 lints triaged, none actionable.

## Open items

- **CSV Import/Export Wizard (Prompts 9–10).** ✅ Import: fully built and live-verified — but re-verified end to end on **2026-08-15**, not 2026-07-26. The chunk write was structurally incapable of inserting a row from the day `unique_tenant_client_email_ci` landed until the `import_leads_chunk` RPC replaced it; treat the earlier "live-verified" date as superseded, not as a second confirmation. ⬜ Export: deliberately deferred as its own follow-up — shares no machinery with import. Full history: `docs/ADDENDA_LOG.md` § Prompt 9 addendum, § Prompt 10 addendum, § Production Gaps Sweep addendum, § CSV import chunk-write RPC.
- **Task/Calendar v1 shipped with four deliberate non-goals.** ✅ Task edit and removal closed 2026-08-19 — a task's title, description and due date are now editable, and `tasks.dismissed` removes a task from every active surface without deleting the row (no DELETE grant and no DELETE policy were added; `authenticated` still holds neither). ⬜ Still open by design: no calendar view; unarchiving a lead does **not** reopen the tasks that were auto-closed when it was archived; and no task `assigned_to` — `leads.assigned_to` shipped 2026-08-18, `tasks` deliberately did not, so task assignment is unblocked but simply unbuilt. Full history: `docs/ADDENDA_LOG.md` § Task/Calendar addendum — Prompts 1 & 2, § Prompt 4, § Prompt 5, § 2026-08-19 — Task editing and non-destructive dismiss.
- **Signup-confirmation path, post `/auth/confirm` PKCE fix.** ⬜ Consciously deferred — the fix should carry over by construction, but is not live-email-verified due to Supabase's auth rate limit. Full history: `docs/ADDENDA_LOG.md` § Signup-confirmation live-email re-check attempt.
- **No account-level (user-scoped) settings surface exists.** ✅ Mostly fixed 2026-07-27 — `AccountPanel` on `/settings` covers password change, display name, and notification preferences. ⬜ Still open by deliberate scope: email change, account deletion (needs its own decision about an OWNER's leads first), and an org switcher (no persisted "active org" concept exists yet). Full history: `docs/ADDENDA_LOG.md` § Account Panel: Password, Display Name, Notification Preferences addendum.
- **3 of 5 `organization_credentials` vault columns have no UI.** ⬜ Partly stale as of 2026-08-11: OpenAI and Twilio genuinely have no caller, but **Resend now has two** (`notify-new-lead.ts`, `send-weekly-report.ts`) — they resolve it via the `PLATFORM_RESEND_API_KEY` env fallback, so per-org BYO Resend is the only piece actually missing. Full history: `docs/ADDENDA_LOG.md` § Settings & Configuration Inventory.
- **The webhook signature carries no timestamp or nonce, so a captured request can be replayed.** ⬜ Registered 2026-08-18 when HMAC signing shipped — the signature covers the body only, so an attacker who captured a valid signed request over a compromised transport could resend those exact bytes and have them accepted. Deliberately not built now: the blast radius is a re-submitted enquiry that already arrived, and repeat enquiries collapse onto the same lead rather than creating duplicates, so a replay adds a submission row rather than corrupting anything. The fix when it is warranted is a timestamped signature (sign `timestamp.body`, send the timestamp in its own header, reject a skew beyond a few minutes) — a breaking protocol change for every caller, which is why it is not being bundled in. Full history: `docs/ADDENDA_LOG.md` § 2026-08-18 — HMAC request signing replaces the URL-path webhook secret.
- **AI Spam Shield over-triggers on the tekguyz.com form's own placeholder copy.** ⬜ Reported not fixed (2026-08-11) — deliberately out of scope of the routing fix, since tuning a classifier is its own change with its own verification. The blast radius is now capped (flagged leads stay visible and still notify), so this is a precision problem, not a data-loss one.
- **`getCurrentOrg()` multi-membership resolution.** ✅ Resolution fixed 2026-08-17 by `94de14b` — it now orders by `organization_members.created_at ASC` (oldest membership wins, stable across sessions) and `console.warn`s on an exact `count > 1` rather than silently dropping the other memberships, which is exactly the decided fix. ⬜ Still open: that `count > 1` branch has **never been exercised against real data** — no user in the live database holds more than one membership, so it is code-inspected only. The org switcher stays separately deferred (bullet below). Full history: `docs/ADDENDA_LOG.md` § 2026-08-16 — Wave decisions, § 2026-08-17 — Deterministic org resolution, and hiding lifecycle controls from a MEMBER.
- **`lead_source`/`service_category` are free text with no managed vocabulary.** ⬜ Deferred as P3 (2026-07-30) — a select/typeahead would help analytics grouping, but needs its own decision about the option list and migrating existing free-text values. Revisit when analytics grouping actually matters.
- **A lead can still name a former member if the membership row was deleted outside `remove_organization_member`.** ⬜ Narrow residual (2026-08-18) — the supported removal path now releases assignments in the same transaction, so this is no longer reachable through the app. It remains reachable by a direct service-role `DELETE` on `organization_members` (a script, or Supabase Studio), because the cleanup lives in the RPC rather than in an FK or a trigger — `leads.assigned_to` references `auth.users(id)`, and no constraint can observe a membership row disappearing. Deliberately not silent when it happens: `AssignmentField` renders the stale value as a "Former member" option, `AssigneeLabel` shows "Former member" on the card, and the assignment trigger's `IS DISTINCT FROM` fast path keeps unrelated edits to such a lead legal. A `BEFORE DELETE` trigger on `organization_members` would close it completely; not built because nothing in the product deletes membership rows any other way. Full history: `docs/ADDENDA_LOG.md` § 2026-08-18 — Team management: role change and member removal.
- **A MEMBER still sees every lead in the tenant; `assigned_to` is ownership, not visibility.** ⬜ Open, unscoped by decision (2026-08-18) — per-row ownership now exists and is filterable ("My leads"), but no RLS policy reads it and none was added. Narrowing SELECT by assignee is a product decision nobody has made, and it would be the first time this schema hid tenant data from a tenant member. Do not treat the column's existence as implying it. Full history: `docs/ADDENDA_LOG.md` § 2026-08-18 — `leads.assigned_to`: per-lead ownership.
- **Command palette (Prompt 8) has no pagination or debounce.** ⬜ Consciously deferred; scale note refreshed 2026-08-18 — **1 lead in the real TEKGUYZ org, 20 in TEKGUYZ Demo**, counted live via read-only SQL. Still trivially fast. Earlier marks: 14/20 on 2026-08-11, which was already stale before it was next read — the sixteen test leads named in CLAUDE.md § Test-Data Cleanup were removed after it was written; and a "0-lead" justification before that. Revisit around low hundreds of contacts. Full history: `docs/ADDENDA_LOG.md` § Known Gaps — Full Historical Record.
- **No org switcher — the slot is reserved, the switcher is not built.** ⬜ Open (2026-08-16) — the shell redesign built `WorkspaceBlock` to render the mark and org name as static content, shaped so it can become a `DropdownMenuTrigger` later without restructuring the sidebar. The prerequisite is a **persisted "active org" concept**, which does not exist: `organization_members` can hold several rows for one user and nothing records which one is current, so switching needs a migration plus resolution plumbing in `getCurrentOrg()`, not a menu. (The resolution half landed 2026-08-17 in `94de14b` — `getCurrentOrg()` is now deterministic and reports extra memberships. The persisted “active org” migration, and therefore the switcher, is still not built.) Deliberately out of the shell prompt's fence, which had no database surface at all. Overlaps the account-settings bullet above, which names the same missing concept. Full history: `docs/ADDENDA_LOG.md` § Application shell redesign.
- **`get_advisors` (security + performance) findings.** ⬜ Re-triaged 2026-08-14 — still mostly by-design or non-issues at current scale (unindexed FKs, `auth_rls_initplan` warnings, unused indexes, RLS-enabled-no-policy on service-role-only tables). New since the 2026-07-22 pass: nine SECURITY DEFINER warnings from the newer 0028/0029 lints. Those are **new lint rules, not new exposure** — all nine are intentional RPC endpoints, and all nine were checked for an internal caller/role gate: eight on 2026-08-14 (see `docs/ADDENDA_LOG.md` § Leads MEMBER-role enforcement addendum → Post-apply verification), plus a ninth, `import_leads_chunk`, which shipped after that pass and self-checks org membership (see `docs/ADDENDA_LOG.md` § CSV import chunk-write RPC → `get_advisors` after apply). Revisit the performance items if row counts reach the thousands. Full history: `docs/ADDENDA_LOG.md` § Known Gaps — Full Historical Record, § Prompt 15b addendum.

- **No `robots.txt` exists, deliberately.** ⬜ Decision recorded, not an oversight (2026-08-15) — `layout.tsx` sets `robots: { index: false, follow: false }`, which is the correct tool for a login-gated app. A `robots.txt` carrying `Disallow: /` was considered and rejected: it would stop crawlers fetching the page at all and therefore stop them ever reading the `noindex`, so a URL can still get indexed from an external link with no snippet. The two signals conflict rather than reinforce. Link unfurls are unaffected by either — Slack and Facebook read OG tags directly and do not apply robots rules. Revisit only if the app ever gets a genuinely public marketing route, which would need indexing rules per-path rather than one blanket meta tag. Full history: `docs/ADDENDA_LOG.md` § Brand application pass.
- **No static OG PNG exists.** ⬜ Deferred (2026-08-14) — `opengraph-image.tsx` covers every link shared from the app, which is the case that matters. A flat file is only needed if the mark goes into an email template or a deck. Generate one from the route output at that point rather than maintaining a second artifact now.

- **The v2 primitives are now verified by eye — with three exceptions.** ✅ Mostly closed 2026-08-14 (second pass). The earlier "never composited" finding was environmental and did **not** survive: with the Browser pane actually open, `document.visibilityState` reads `visible`, the page hydrates, real geometry is non-zero and screenshots work. Confirmed visually on `/design` in both panes: both themes force correctly against the ambient theme, all four Button variants × four states render flat (`box-shadow: none` in every one), primary/danger contrast measured at 6.54:1 and 5.93:1 light / 5.26:1 and 5.50:1 dark (all pass WCAG AA), the keyboard focus ring paints on `:focus-visible`, Input error border + message render in `--danger`, the Going Cold dashed border shows on both Card and table row, Modal opens at Level 2 and closes via X and backdrop click, and Popover opens at a visibly lighter Level 1. ⬜ Still unverified: (1) **NavItem hover**, still untested. (2) **The Button loading spinner turning** — correct by design here, since this machine reports `prefers-reduced-motion: reduce` and the project's own rule clamps it; the element was proven to rotate when driven directly via the Web Animations API. Full detail: `docs/ADDENDA_LOG.md` § Design System v2 "Structural Neutral" — foundation layer.
- **`input:focus-visible`'s `border-color: var(--accent)` is dead CSS.** ⬜ Open (2026-08-14) — the rule lives in `@layer base`, but `Input`/`Textarea`/`Select` each carry a `border-hairline` utility, and Tailwind utilities sit in a later cascade layer, so the border stays hairline on focus. Harmless today: the paired 1px `box-shadow` accent ring still paints, so the accessibility floor holds and focus is clearly visible. Either drop the dead declaration or move the focus border into the primitives. (This bullet used to say "fix together with the global `:focus-visible` outline gap below" — that companion bullet was withdrawn as mis-measured on 2026-08-16 and is in `docs/ADDENDA_LOG.md` § Known Gaps — Resolved Items Archive. This one is unaffected and still open; it was never re-measured.)
- **No browser-based test runner exists, so nothing can assert that a focus ring actually *paints*.** ⬜ Open (2026-08-17) — narrowed from the "nothing tests that a focus ring paints" gap closed the same day. `src/components/ui/dropdown-menu.test.tsx` now catches the regression that actually happened (a row carrying `outline-none`) at the class level, and was proven to fail before being trusted. What is still unreachable is the paint itself: jsdom's `getComputedStyle` does not apply stylesheet rules and `vitest.config.mts` sets `css: false`, so an outline read is empty for correct and broken components alike. A real assertion needs Playwright or vitest browser mode; neither is installed, and adding a second runner is a standalone decision, not a side effect of a test fix. Full history: `docs/ADDENDA_LOG.md` § 2026-08-17 — a regression test for the focus-ring floor.
- **`KanbanColumn`'s shell is not a `Card`, and that is deliberate.** ⬜ No action needed in any future prompt — ruled **not a defect** by the owner on 2026-08-15, recorded here so it is not "fixed" by a later sweep. `Card` renders a `<div>`, whereas the column is a deliberate `<section>` landmark, and its recessed `bg-canvas-soft` is the opposite of `Card`'s `bg-canvas-pure`. (This bullet previously also tracked `NeedsReviewQueue`, closed by Prompt 2b, and `HelpTrigger`, closed by Prompt 2c — both are in the Resolved Items Archive.)
- **Existing components have no tests.** ⬜ Open (2026-08-14, count refreshed 2026-08-19) — Vitest + RTL cover the v2 primitives, plus the invite-list filter and the two lead-lifecycle role gates: **143 tests, 23 suites** as of 2026-08-19, counted from a real `npx vitest run`. Three additions on 2026-08-19, with task edit/dismiss: `src/lib/tasks/actions.test.ts` (7, including an exact-key-set assertion that `updateTask` moves no lifecycle column), `src/lib/tasks/queries.test.ts` (4, asserting the `dismissed` filter is applied at the database in both task queries), and `TaskRow.test.tsx` (6). Earlier the same week: 126/20 on 2026-08-18. Three additions that day: `AssignmentField.test.tsx` (6, with `leads.assigned_to`), `MemberRow.test.tsx` (6, with team management — one of which was proven to fail against the pre-fix code rather than only to pass against the fix), and `src/lib/webhooks/signature.test.ts` (14, with HMAC webhook signing — its pinned digest confirmed independently via `openssl dgst -sha256 -hmac`, not copied from the implementation's own output). Earlier the same day: 112/19. Earlier marks: 100/17 after `94de14b` added `ArchiveControls.test.tsx` and `OutcomeFields.test.tsx` at 4 tests each, 92/15 after the four-gap wave, 82/13 at the shell redesign, 74/12 at the pre-auth v2 rollout, 67/10 at the stuck-invite fix, 62/9 at the primitive audit, 49/8 at Prompt 1. Everything predating them is untested. **This count is refreshed on every handoff audit** — the 92/15 mark survived two sessions after `94de14b` made it wrong, because the audit checked gaps the session had *touched* and never cross-checked a figure it had just measured.
