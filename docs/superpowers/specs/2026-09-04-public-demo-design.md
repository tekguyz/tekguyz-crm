# Public read-only demo entry point

**Date:** 2026-09-04
**Status:** design approved, not implemented
**Belongs to:** `docs/ROADMAP.md` P1 — Login/landing redesign. This is P1's first
shipped piece, not a parallel initiative. The rest of P1 (redesigned `/login`,
onboarding, a marketing landing page) stays open.

---

## 1. Problem

tekguyz.com's `/work/tekguyz-crm` case study links to this app, and an anonymous
visitor lands on `/login`. That is a dead end. The case study claims a build
exists and then offers no way to see it.

## 2. Goal

One click from an external link puts a visitor inside the real app, looking at
the seeded `TEKGUYZ Demo` data, with no signup, no password and no email — and
with **zero ability to write anything**, enforced by the database rather than by
the UI.

## 3. Shape of the solution

A permanent, powerless identity. Because it can never write:

- there is no staleness, so no reset job, no cron and no schedule;
- there is no race between concurrent visitors;
- there is no public endpoint that mutates anything, so nothing to rate-limit.

Simplicity is the requirement here, not a compromise. This is a low-traffic
portfolio link, not a product surface.

## 4. The read-only mechanism

### Decision

**A dedicated Postgres role, `demo_readonly`, holding `SELECT` and nothing
else.** Not a new `VIEWER` value in `organization_members.role`.

### Why not `VIEWER`

The OWNER/ADMIN/MEMBER model lives *above* RLS, inside policy predicates.
Making a `VIEWER` value read-only means editing every write policy **and**
guarding every `SECURITY DEFINER` RPC, because a SECURITY DEFINER function
bypasses policies entirely.

Write policies that would need the clause (9):

| Table | Policies |
|---|---|
| `public.leads` | `Members create tenant leads`, `Members write tenant leads` |
| `public.activity_logs` | `Members create tenant logs` |
| `public.tasks` | `Tenant members insert their tasks`, `Tenant members update their tasks` |
| `public.prospects` | `Members create tenant prospects`, `Members write tenant prospects` |
| `public.lead_submissions` | `Members create tenant submissions` |
| `public.organization_members` | `Members update their own notification preferences` |
| `storage.objects` | `Members upload tenant audio notes` |

(`organizations` UPDATE and the two `organization_invites` write policies are
already OWNER/ADMIN-gated and would be safe either way.)

`SECURITY DEFINER` RPCs granted to `authenticated` that policies cannot stop (9):
`import_leads_chunk`, `import_prospects_chunk`, `create_organization_with_owner`,
`accept_organization_invite`, `change_member_role`, `remove_organization_member`,
`vault_set_org_credential`, `vault_clear_org_credential`, `get_org_webhook_secret`.

That is **18 edit sites**, each of which must be remembered again for every
table and every RPC added in future. A forgotten clause is a silent write hole.
**It fails open.**

### Why a Postgres role

Grants are checked *below* RLS. `demo_readonly` holds `SELECT` on the tenant
tables and no other privilege, so:

- every `INSERT` / `UPDATE` / `DELETE` fails with `permission denied for table …`,
  on every table, with no policy edits at all;
- all 9 RPCs fail with `permission denied for function …`, because the role holds
  no `EXECUTE` grant — zero guards written;
- a table added in future is covered by default. Supabase's default privileges
  grant new `public` tables to `anon`/`authenticated`/`service_role`, and
  deliberately **not** to `demo_readonly`, so a new table is unwritable by this
  role from the moment it is created. **It fails closed.**

A failure mode that fails closed shows up as the demo being too locked down,
which is visible on the first click. The `VIEWER` failure mode is a stranger
writing to the database, which is visible never.

### Why this does not create a second tenant-resolution path

**No policy in this schema carries a `TO` clause.** Verified across every
migration: all of them default to `PUBLIC`, so they apply to any Postgres role.
The existing read policies therefore keep working unchanged for `demo_readonly`
— still `organization_id in (select private.current_org_ids())`, still keyed on
`auth.uid()`, still resolved through exactly one `organization_members` row.
Tenant resolution is the same mechanism it has always been. Nothing new is
invented, which is what CLAUDE.md's rule 1 and the brief's §5 require.

### The one unknown — resolve before anything else is built

Something must make the visitor's JWT carry `role: demo_readonly` instead of
`role: authenticated`, because PostgREST does `set local role <that claim>`.

Two candidates, neither yet run in this project:

1. **`auth.users.role` column.** GoTrue copies this column into the token's
   `role` claim. Set once by a service-role script. No project configuration
   change.
2. **Custom Access Token Hook.** A `SECURITY DEFINER` function Supabase calls at
   token mint, which rewrites the claim. Requires enabling the hook in the
   Supabase dashboard — a human step, like applying DDL.

**Implementation step 1 is a spike that proves which one works**, by minting a
token for the demo account and decoding its `role` claim. Candidate 1 first, as
it needs no configuration change. **If neither works, stop and report back** —
do not silently fall back to the 18-site `VIEWER` version.

## 5. Migration

One file, handed over unapplied after a temp-table-replica dry run.

```sql
-- The role itself. NOLOGIN: it is only ever reached by PostgREST doing
-- `set local role`, never by a direct connection.
create role demo_readonly nologin;

-- PostgREST's connection role must be able to switch into it.
grant demo_readonly to authenticator;

grant usage on schema public to demo_readonly;
grant usage on schema private to demo_readonly;
grant usage on schema storage to demo_readonly;

-- Tenant resolution, identical to every other role's path.
grant execute on function private.current_org_ids() to demo_readonly;

-- SELECT and nothing else. No INSERT, no UPDATE, no DELETE, anywhere.
grant select on
    public.organizations,
    public.organization_members,
    public.organization_invites,
    public.leads,
    public.activity_logs,
    public.tasks,
    public.lead_submissions,
    public.prospects
to demo_readonly;

-- Read access to seeded voice notes; no INSERT, so no upload.
grant select on storage.objects to demo_readonly;

-- Deliberately NOT granted: public.organization_credentials (no role has
-- grants on it), public.report_sends (service-role only), and every
-- SECURITY DEFINER function in the public schema.

-- Marks the demo org so the weekly-report cron can skip it.
alter table public.organizations
    add column is_demo boolean not null default false;
```

Note there is no `check_valid_role` change and no new role value. The
`organization_members.role` of the demo visitor stays `'MEMBER'`; that column is
about tenant permissions and is left alone.

## 6. Identity

A new account, credentials read from the environment:

- `DEMO_VISITOR_EMAIL`
- `DEMO_VISITOR_PASSWORD`

Never a literal in source, matching how `PLATFORM_RESEND_API_KEY` and
`PLATFORM_GEMINI_API_KEY` are handled. Created by an addition to
`scripts/seed/lib/demo-org.ts` (one new function, no restructuring), which also
inserts its single `organization_members` row for `TEKGUYZ Demo` with role
`'MEMBER'`.

`tekguyz.demo.owner@example.com` and its OWNER role are **not touched**.

## 7. Entry point

`src/app/demo/route.ts` — a GET route handler at `/demo`.

- Signs the demo visitor in server-side with `signInWithPassword`, drops the
  session cookie, 302s to `/`.
- One click, no page, no interstitial form.
- Returns 503 if `DEMO_VISITOR_EMAIL` / `DEMO_VISITOR_PASSWORD` are unset, so a
  misconfigured deploy fails loudly rather than 500-ing.

**Its guard reasoning, which is different from `dev-login`'s and belongs in the
file as a comment:** `/api/dev-login` keeps its `NODE_ENV === "development"`
allowlist because it signs in an **OWNER**, which is a genuinely dangerous
identity. `/demo` needs no environment guard because the identity behind it
holds no privilege at all — publishing it grants a stranger exactly the read
access the case study is advertising. The guard on `dev-login` is untouched and
must stay.

**Side-effect-on-GET is accepted deliberately.** Signing in is idempotent and
mutates nothing; a link prefetcher that hits it mints a throwaway token and
nothing else. The alternative (a page plus a POST) buys nothing here, because
without a reset there is no work to show a loading indicator for.

**Middleware:** `/demo` is not under `/api/`, so `src/lib/supabase/middleware.ts`
gets an explicit allowlist entry alongside the auth routes. This is deliberate,
not incidental exemption via the `/api/` prefix.

**noindex:** the route returns a 302 with no HTML body, so there is nothing for a
crawler to index; the visitor lands on `/`, which carries the app-wide
`robots: { index: false, follow: false }` from `layout.tsx`. Proven by showing
the actual response status and headers, not asserted. **`robots.txt` is not
created or modified** — `docs/KNOWN_GAPS.md`'s entry on it is a permanent
rejection.

## 8. Independent bug fix — the weekly-report email leak

`src/app/api/cron/weekly-report/route.ts` sweeps every organization. That means
`TEKGUYZ Demo` gets a Gemini executive narrative generated and a Resend email
sent to `tekguyz.demo.owner@example.com` — a fake `@example.com` address —
every week. `scripts/seed/create-demo-org.ts` flagged this in its own output when
the demo org was first built, and it was never fixed.

Fix: the org sweep becomes `.select("id").eq("is_demo", false)`. No other
organization's behaviour changes. This is a real bug independent of this feature
and lands regardless.

## 9. Gemini spend

Traced: Gemini is called from exactly three places, and **none is a page render
path**.

| Call site | Trigger | Reachable by demo? |
|---|---|---|
| `src/lib/webhooks/ingest-lead.ts` (spam shield) | Inbound webhook only | No — HMAC-gated; this account cannot read `webhook_secret` |
| `src/lib/activity/audio-transcription.ts` | Voice memo save | No — the storage upload and the `activity_logs` insert both fail on grant first |
| `src/lib/reports/generate-executive-narrative.ts` | Weekly cron | No — fixed by §8 |

Structurally the demo cannot reach any of them. **The explicit skip is still
added anyway**, per the brief, so the guarantee does not depend on the grant
being right: `transcribeAndSaveAudioNote` returns early with the message
`"Voice notes are not transcribed in the public demo."` and never constructs a
`GoogleGenAI` client. This holds whether or not `PLATFORM_GEMINI_API_KEY` is set.

**How "read-only caller" is detected there, stated exactly so it is not
reinvented at implementation time:** the function already resolves
`lead.organization_id` for its tenant check. It reads `organizations.is_demo`
for that id and skips on `true`. That is the same column §5 adds and §8 uses —
one marker, three consumers, no second source of truth. It keys on the *org*,
not the user, so it also holds if a second demo identity is ever added.

Voice memo is **strictly read-only** — the recorder records, and saving is denied
by the database. Decided 2026-09-04: an `activity_logs` INSERT carve-out would
have broken the "it cannot write" guarantee and handed a stranger an unbounded
way to fill the table and the storage bucket, with no reset job to clean it.

## 10. Confirmed, not assumed

- **A classifier verdict routes a lead, it never hides one** — irrelevant here.
  The spam shield runs only on the webhook path, which is HMAC-authenticated
  against `organizations.webhook_secret`, and `get_org_webhook_secret` is both
  OWNER/ADMIN-gated *and* unreachable for `demo_readonly` (no `EXECUTE` grant).
  The demo account cannot trigger a classifier at all.
- **Archiving is not removal** — irrelevant here. `leads.archived` is
  OWNER/ADMIN-only via the Prompt-14 trigger, *and* `demo_readonly` holds no
  `UPDATE` grant on `leads`. This account cannot archive anything, so it can
  leave no archived residue.

## 10a. Known risk — Storage reads under a non-standard role

`grant select on storage.objects to demo_readonly` is written on the assumption
that Supabase Storage applies RLS the same way PostgREST does. Storage is a
separate service with its own JWT handling, and it may assume the `authenticated`
role. **If it does, audio-note playback will fail for the demo identity.**

This is low-consequence: the seeded demo data contains no audio notes, so there
is nothing for a visitor to play. If it turns out to be broken, the disposition
is to register it in `docs/KNOWN_GAPS.md` and move on — **not** to widen the
role's grants to make it work. Verify during implementation and record the
finding either way.

## 11. Out of scope — explicitly not built

- No reset-on-entry, no cron job, no CSV row cap, no storage purge job. None
  apply to an account that cannot write.
- No "reset" button, admin panel or management UI. The entry link is the whole
  surface.
- Nothing under `src/app/api/v1/triage/` or `src/lib/webhooks/`. No `leads` DDL,
  no `LEAD_COLUMNS` change. **The live tekguyz.com contact form is unaffected.**
  If implementation discovers a reason this must change, stop and report before
  writing a workaround.
- No `robots.txt`.

## 12. Verification

New file `src/lib/demo/demo-visitor.rls.test.ts`, run by `npm run test:rls`,
proving as the demo visitor:

1. `SELECT` returns the seeded `TEKGUYZ Demo` rows (leads, tasks, prospects,
   activity logs) — the demo actually shows data.
2. `INSERT`, `UPDATE` and `DELETE` are each denied on every reachable table:
   `leads`, `activity_logs`, `tasks`, `prospects`, `lead_submissions`,
   `organizations`, `organization_members`.
3. Exactly one `organization_members` row exists for this user, and its
   `organization_id` is not the real TEKGUYZ org.
4. `get_org_webhook_secret` is denied.
5. A cross-tenant `SELECT` against the real TEKGUYZ org id returns zero rows.

Plus, before the work is called done:

- `npm run build`, `npm run lint`, `npx tsc --noEmit`, `npx vitest run` all pass.
- A live check that `/demo` with no prior session lands signed-in on `/` with
  seeded data, and that an attempted write is refused **by the database** — the
  actual error pasted, not a screenshot of a greyed-out button.
- The migration's temp-table-replica dry-run output pasted verbatim.
- A statement, by filename, that nothing under the webhook/triage path changed.

## 13. Data safety, on the record

Every seeded row is invented. Phone numbers are all in the `555-01xx` block,
reserved for fiction. Company names are transparently fake ("RiverStone Roofing
Co.", "Fake Falls Plumbing", "Placeholder Pest Control") and every email domain
matches its invented company. Prospect `place_id`s are `demo-place-####`, which
no real Google Place ID resembles.

**No real customer data is reachable from the demo identity.** Two independent
reasons: the seeded rows are synthetic to begin with, and RLS makes the real
TEKGUYZ org invisible to an identity that holds no membership row in it.

## 14. The link for tekguyz.com

```
https://tekguyz-crm.vercel.app/demo
```

One line in that repo's `content/work.ts`.
