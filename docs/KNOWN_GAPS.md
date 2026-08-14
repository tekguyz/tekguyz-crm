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

- **CSV Import/Export Wizard (Prompts 9–10).** ✅ Import: fully built and live-verified (2026-07-26). ⬜ Export: deliberately deferred as its own follow-up — shares no machinery with import. Full history: `docs/ADDENDA_LOG.md` § Prompt 9 addendum, § Prompt 10 addendum, § Production Gaps Sweep addendum.
- **Signup-confirmation path, post `/auth/confirm` PKCE fix.** ⬜ Consciously deferred — the fix should carry over by construction, but is not live-email-verified due to Supabase's auth rate limit. Full history: `docs/ADDENDA_LOG.md` § Signup-confirmation live-email re-check attempt.
- **No account-level (user-scoped) settings surface exists.** ✅ Mostly fixed 2026-07-27 — `AccountPanel` on `/settings` covers password change, display name, and notification preferences. ⬜ Still open by deliberate scope: email change, account deletion (needs its own decision about an OWNER's leads first), and an org switcher (no persisted "active org" concept exists yet). Full history: `docs/ADDENDA_LOG.md` § Account Panel: Password, Display Name, Notification Preferences addendum.
- **Team management is view-only beyond invites.** ⬜ Flagged, not fixed (2026-07-25) — no role change or member removal. Becomes urgent at the first real MEMBER invite, same trigger as the `leads` role-enforcement gap below. Full history: `docs/ADDENDA_LOG.md` § Settings & Configuration Inventory.
- **3 of 5 `organization_credentials` vault columns have no UI.** ⬜ Partly stale as of 2026-08-11: OpenAI and Twilio genuinely have no caller, but **Resend now has two** (`notify-new-lead.ts`, `send-weekly-report.ts`) — they resolve it via the `PLATFORM_RESEND_API_KEY` env fallback, so per-org BYO Resend is the only piece actually missing. Full history: `docs/ADDENDA_LOG.md` § Settings & Configuration Inventory.
- **The webhook secret is a bearer credential carried in the URL path, so it lands in request logs.** ⬜ Reported not fixed (2026-08-11) — it is unavoidably logged by Vercel/Next on every ingest (`POST /api/v1/triage/<secret>`), and stored as a plain `uuid` column rather than in Vault like `organization_credentials`. Rotation is the current mitigation and works. Moving it to a header, or better to an HMAC payload signature, is the real fix but is a breaking change for every live integration. Full analysis: `docs/ADDENDA_LOG.md` § Webhook secret exposure audit.
- **`leads` has no `message` column — the visitor's own words are not first-class data.** ⬜ Reported not fixed (2026-08-11) — the enquiry text survives only inside `activity_logs.content` as raw webhook JSON, so it is unsearchable and invisible in the UI, yet it is the main thing the spam shield scores. Needs a migration plus read/display plumbing; revisit when lead detail matters more than lead routing.
- **Webhook ingestion upserts by email, overwriting the earlier enquiry.** ⬜ Reported not fixed (2026-08-11) — a returning address overwrites `client_name`/`company`/`service_category` and reactivates an archived row to NEW. Demonstrated live on `510c28db`. Deliberate for the Resurrection Engine, almost certainly not for the overwrite; needs a decision (append a new lead vs. keep first-write-wins) before it is changed.
- **AI Spam Shield over-triggers on the tekguyz.com form's own placeholder copy.** ⬜ Reported not fixed (2026-08-11) — deliberately out of scope of the routing fix, since tuning a classifier is its own change with its own verification. The blast radius is now capped (flagged leads stay visible and still notify), so this is a precision problem, not a data-loss one.
- **10 pre-existing shield-archived leads are still hidden.** ⬜ Backfill scoped but deliberately not run (2026-08-11) — the fix is forward-only. Exact scope and the one-statement backfill are in `docs/ADDENDA_LOG.md` § Spam Shield routing fix; it is the owner's call, not a silent cleanup.
- **`lead_source`/`service_category` are free text with no managed vocabulary.** ⬜ Deferred as P3 (2026-07-30) — a select/typeahead would help analytics grouping, but needs its own decision about the option list and migrating existing free-text values. Revisit when analytics grouping actually matters.
- **`leads` CRUD has zero role enforcement** — any MEMBER has full CRUD parity with OWNER/ADMIN. ⬜ **Trigger has now fired (re-triaged 2026-08-11) — no longer theoretical.** The 2026-07-22 deferral rested on "zero MEMBER-role users exist"; there are now 2 real MEMBERs, both in `TEKGUYZ Demo` (the real `TEKGUYZ` org still has only its OWNER). Exposure is demo data only, so it is not urgent, but the original justification no longer holds — decide before a MEMBER is added to the real org. Same trigger as the Team-management gap above. Full history: `docs/ADDENDA_LOG.md` § Known Gaps — Full Historical Record.
- **Command palette (Prompt 8) has no pagination or debounce.** ⬜ Consciously deferred; scale note refreshed 2026-08-11 — 14 leads in the real org, 20 in demo, so still trivially fast (the old "0-lead" justification was stale). Revisit around low hundreds of contacts. Full history: `docs/ADDENDA_LOG.md` § Known Gaps — Full Historical Record.
- **Mobile AppShell/Sidebar has no responsive collapse.** ⬜ Deferred (2026-07-25) — likely folded into the upcoming Claude Design pass rather than patched standalone; timing still an open decision, not ignored. Full history: `docs/ADDENDA_LOG.md` § Known Gaps — Full Historical Record.
- **`get_advisors` (security + performance) findings.** ⬜ Triaged 2026-07-22 — mostly by-design or non-issues at current scale (unindexed FKs, `auth_rls_initplan` warnings, unused indexes, RLS-enabled-no-policy on service-role-only tables). Revisit the performance items if row counts reach the thousands. Full history: `docs/ADDENDA_LOG.md` § Known Gaps — Full Historical Record, § Prompt 15b addendum.
- **Manual, human-only checklist:** enable Leaked Password Protection (Authentication → Policies/Providers) once this project is off Supabase's free tier — confirmed off as of 2026-07-24, correctly not actionable today. The only item in this file that needs a human dashboard action, not a code fix.
