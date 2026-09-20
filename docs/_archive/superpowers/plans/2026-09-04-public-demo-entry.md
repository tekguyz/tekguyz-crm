# Public Read-Only Demo Entry Point — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give tekguyz.com a one-click link that drops an anonymous visitor inside the live CRM looking at seeded data, with database-enforced inability to write anything.

**Architecture:** A permanent demo identity whose JWT carries a dedicated Postgres role, `demo_readonly`, that holds `SELECT` and nothing else. Grants are checked below RLS, so every write and every `SECURITY DEFINER` RPC is denied with zero policy edits and zero new tenant-resolution logic. A GET route handler at `/demo` signs that identity in server-side and redirects to `/`.

**Tech Stack:** Next.js 15 App Router (Route Handlers, middleware), Supabase (Postgres RLS, GoTrue auth, PostgREST), `@supabase/ssr`, Vitest (separate live RLS config), TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-04-public-demo-design.md` — read it alongside this plan. Every "why" lives there; this file is the "how".

## Global Constraints

Every task's requirements implicitly include all of these.

- **Never touch** `src/app/api/v1/triage/`, `src/lib/webhooks/`, `LEAD_COLUMNS` in `src/lib/leads/queries.ts`, or any `leads` DDL. The live tekguyz.com contact form depends on these. If a task appears to require it, **stop and report** — do not write a workaround.
- **Never modify** `src/app/api/dev-login/route.ts`. Its `NODE_ENV === "development"` allowlist stays exactly as it is.
- **Never create or modify** `robots.txt`. `docs/KNOWN_GAPS.md` records its absence as a permanent rejection.
- **Never modify** `tekguyz.demo.owner@example.com` or its OWNER role in `scripts/seed/lib/demo-org.ts`. Add alongside it; do not restructure the file.
- **Never call `apply_migration` or any DDL tool.** Migrations are written to a file, dry-run, and handed to the human unapplied. This project's Supabase MCP is not authorized for writes.
- **Credentials are environment variables, never literals in source.** Exact names: `DEMO_VISITOR_EMAIL`, `DEMO_VISITOR_PASSWORD`.
- **The role name is exactly `demo_readonly`.** The marker column is exactly `public.organizations.is_demo`.
- **The public URL is exactly `/demo`.** Full link for tekguyz.com: `https://tekguyz-crm.vercel.app/demo`.
- **Test residue rule:** anything a verification step creates in the database is part of that task and must be removed before the task is called done.

---

## File Structure

**Create:**

| Path | Responsibility |
|---|---|
| `scripts/spike/check-jwt-role.ts` | Throwaway. Proves the JWT can carry a custom `role` claim. Deleted in Task 1. |
| `supabase/migrations/20260904120000_demo_readonly_role.sql` | The `demo_readonly` role, its grants, and `organizations.is_demo`. |
| `scripts/seed/lib/demo-visitor.ts` | Creates the demo-visitor auth user, sets its role claim, inserts its one membership row. |
| `src/lib/demo/is-demo-org.ts` | One function: does this org id have `is_demo = true`. Shared by the cron fix and the transcription skip. |
| `src/lib/demo/demo-visitor.rls.test.ts` | Live proof of read-yes / write-no / no-cross-tenant. |
| `src/app/demo/route.ts` | The public GET entry point. |

**Modify:**

| Path | Change |
|---|---|
| `scripts/seed/lib/demo-org.ts` | Export `DEMO_ORG_NAME` already exists; add a call-through to `demo-visitor.ts`. No restructuring. |
| `scripts/seed/create-demo-org.ts` | Call the new visitor-provisioning function. |
| `src/lib/env/validate-env.ts` | Add the two new required vars. |
| `src/lib/supabase/middleware.ts` | Explicit `/demo` allowlist entry. |
| `src/app/api/cron/weekly-report/route.ts` | Exclude demo orgs from the sweep. |
| `src/lib/activity/audio-transcription.ts` | Skip Gemini for a demo org. |
| `docs/ROADMAP.md`, `docs/KNOWN_GAPS.md`, `CLAUDE.md`, `docs/ADDENDA_LOG.md`, `docs/addenda/2026-09.md`, `docs/SCHEMA_REFERENCE.md` | Documentation, Task 8. |

---

## Task 1: Spike — prove the JWT can carry `role: demo_readonly`

**This is a gate.** Nothing else in this plan works if it fails. It creates and deletes one disposable auth user and needs no DDL.

**Files:**
- Create: `scripts/spike/check-jwt-role.ts` (deleted at the end of this task)

**Interfaces:**
- Consumes: nothing.
- Produces: a decision recorded in the task report — `AUTH_USERS_ROLE_COLUMN` works, or `NEEDS_AUTH_HOOK`, or `BLOCKED`.

- [ ] **Step 1: Write the spike script**

Create `scripts/spike/check-jwt-role.ts`:

```typescript
// THROWAWAY SPIKE — delete after running. See
// docs/superpowers/plans/2026-09-04-public-demo-entry.md Task 1.
//
// Question: does GoTrue copy auth.users.role into the JWT's `role` claim?
// PostgREST does `set local role <that claim>`, so the answer decides whether
// the demo_readonly mechanism is reachable without a Custom Access Token Hook.
//
// Run: npx tsx --env-file=.env scripts/spike/check-jwt-role.ts
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SERVICE = process.env.SUPABASE_SECRET_KEY!;

const RUN = Math.random().toString(36).slice(2, 10);
const EMAIL = `spike-jwt-role-${RUN}@example.com`;
const PASSWORD = `Spike-Jwt-Role-${RUN}!`;

function decodeClaims(accessToken: string): Record<string, unknown> {
  const payload = accessToken.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

async function main() {
  const admin = createClient(URL, SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { spike: RUN, purpose: "throwaway JWT role spike" },
  });
  if (createError || !created.user) {
    throw new Error(`createUser failed: ${createError?.message}`);
  }
  const userId = created.user.id;

  try {
    // Sign in BEFORE changing the role, to capture the baseline claim.
    const anonBefore = createClient(URL, ANON, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: before, error: beforeError } = await anonBefore.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });
    if (beforeError || !before.session) {
      throw new Error(`baseline signIn failed: ${beforeError?.message}`);
    }
    console.log("BASELINE role claim:", decodeClaims(before.session.access_token).role);

    // Candidate 1: the admin API's `role` field, which maps to auth.users.role.
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      role: "demo_readonly",
    } as { role: string });
    if (updateError) {
      console.log("RESULT: NEEDS_AUTH_HOOK — updateUserById rejected `role`:", updateError.message);
      return;
    }

    const anonAfter = createClient(URL, ANON, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: after, error: afterError } = await anonAfter.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });
    if (afterError || !after.session) {
      throw new Error(`post-update signIn failed: ${afterError?.message}`);
    }

    const roleClaim = decodeClaims(after.session.access_token).role;
    console.log("AFTER role claim:", roleClaim);
    console.log(
      roleClaim === "demo_readonly"
        ? "RESULT: AUTH_USERS_ROLE_COLUMN — candidate 1 works, no auth hook needed."
        : `RESULT: NEEDS_AUTH_HOOK — claim stayed "${roleClaim}".`,
    );
  } finally {
    await admin.auth.admin.deleteUser(userId);
    console.log(`Cleaned up spike user ${EMAIL}.`);
  }
}

main().catch((err) => {
  console.error("RESULT: BLOCKED —", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Run it**

Run: `npx tsx --env-file=.env scripts/spike/check-jwt-role.ts`

Expected: one of three lines beginning `RESULT:`. Record the whole output verbatim in the task report.

- [ ] **Step 3: Act on the result**

- `AUTH_USERS_ROLE_COLUMN` → continue to Task 2. Task 3 will set the role via `updateUserById`.
- `NEEDS_AUTH_HOOK` → **stop and report to the human.** Enabling a Custom Access Token Hook is a Supabase dashboard change they must make; it is not an agent action. Do not proceed and do not substitute the 18-site `VIEWER` design.
- `BLOCKED` → **stop and report the error.**

- [ ] **Step 4: Delete the spike and confirm no residue**

```bash
rm scripts/spike/check-jwt-role.ts
rmdir scripts/spike
```

The script deletes its own auth user in a `finally` block. Confirm by checking the Supabase Auth users list for any `spike-jwt-role-*@example.com` address and deleting it if the script died before cleanup.

- [ ] **Step 5: No commit**

Nothing to commit — the spike produced an answer, not code. Report the answer and move on.

---

## Task 2: The migration

**Files:**
- Create: `supabase/migrations/20260904120000_demo_readonly_role.sql`

**Interfaces:**
- Consumes: Task 1's `AUTH_USERS_ROLE_COLUMN` result.
- Produces: the Postgres role `demo_readonly`, and the column `public.organizations.is_demo boolean not null default false`. Both are consumed by Tasks 3–7.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260904120000_demo_readonly_role.sql`:

```sql
-- Public read-only demo identity — the enforcement half.
--
-- Design: docs/superpowers/specs/2026-09-04-public-demo-design.md § 4.
--
-- Why a Postgres role and not a new VIEWER value in organization_members.role:
-- grants are checked BELOW RLS. A role holding only SELECT is denied every
-- INSERT/UPDATE/DELETE on every table, and is denied every SECURITY DEFINER
-- RPC it holds no EXECUTE on, with zero policy edits. The VIEWER alternative
-- needed a clause added to 9 write policies and a guard added to 9 RPCs that
-- bypass policies entirely — 18 sites, each of which must be remembered again
-- for every future table. That fails open. This fails closed: Supabase's
-- default privileges grant new public tables to anon/authenticated/service_role
-- and deliberately NOT to demo_readonly, so a table added next year is
-- unwritable by this role from the moment it is created.
--
-- Why this needs no policy changes at all: not one policy in this schema
-- carries a TO clause, so every policy already applies to PUBLIC — any role.
-- demo_readonly is therefore covered by the existing read policies unchanged,
-- still scoped by `organization_id in (select private.current_org_ids())`,
-- still keyed on auth.uid(), still resolved through exactly one
-- organization_members row. No second tenant-resolution path is introduced.

-- 1. THE ROLE
--
-- NOLOGIN: it is never connected to directly. PostgREST reaches it by doing
-- `set local role demo_readonly` from the JWT's role claim, which is why
-- `authenticator` must be able to switch into it.
create role demo_readonly nologin;
grant demo_readonly to authenticator;

-- 2. SCHEMA ACCESS
grant usage on schema public to demo_readonly;
grant usage on schema private to demo_readonly;
grant usage on schema storage to demo_readonly;

-- Tenant resolution — the same SECURITY DEFINER helper every other role uses.
grant execute on function private.current_org_ids() to demo_readonly;

-- 3. SELECT, AND NOTHING ELSE
--
-- Deliberately absent, and each absence is load-bearing:
--   - no INSERT/UPDATE/DELETE on anything, anywhere;
--   - public.organization_credentials — no role holds grants on it (Prompt 13a);
--   - public.report_sends — service-role only;
--   - EXECUTE on every public-schema function, which is what makes
--     import_leads_chunk, import_prospects_chunk, accept_organization_invite,
--     change_member_role, remove_organization_member, vault_set_org_credential,
--     vault_clear_org_credential, create_organization_with_owner and
--     get_org_webhook_secret all fail with "permission denied for function".
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

-- Read seeded voice notes. No INSERT grant, so no upload is possible.
-- NOTE: Supabase Storage is a separate service with its own JWT handling and
-- may assume the `authenticated` role regardless of this grant. If audio
-- playback turns out not to work for the demo identity, the disposition is to
-- register it in docs/KNOWN_GAPS.md — NOT to widen this role's grants. The
-- seeded demo data contains no audio notes, so nothing is lost either way.
grant select on storage.objects to demo_readonly;

-- 4. THE DEMO-ORG MARKER
--
-- One column, three consumers: the weekly-report cron's org sweep, the voice
-- transcription skip, and any future "is this the demo" question. Keyed on the
-- org rather than on the user so it still holds if a second demo identity is
-- ever added.
alter table public.organizations
    add column is_demo boolean not null default false;
```

- [ ] **Step 2: Dry-run the DDL against a temp-table replica**

This project's standing rule: an agent's migration is unverified until it fails in the human's hands, and `tsc`/`eslint`/`next build` cannot see SQL. A temp table plus session-local objects touches no `public`-schema object and stays inside the read-only allowance.

Because the Supabase MCP is not authorized here, run the dry-run as a disposable service-role script — but note that `create role` is cluster-level and cannot be made session-local. **Dry-run only the parts that can be:** the column addition and the grant syntax, against a temp replica.

Create a throwaway `scripts/spike/dryrun-migration.ts` that executes, in one session:

```sql
create temp table organizations_replica (like public.organizations including all);
alter table organizations_replica add column is_demo boolean not null default false;
select count(*) from organizations_replica where is_demo = false;
drop table organizations_replica;
```

Expected: no error, `count` returns `0`. Paste the output verbatim in the task report. Delete the script afterwards.

For the role and grant statements, verification is by review against `docs/SCHEMA_REFERENCE.md`'s grant inventory plus the human's apply step — a role cannot be created session-locally, and that limitation is itself worth stating in the report rather than hiding.

- [ ] **Step 3: Hand the migration over, unapplied**

Report to the human:
- the full path to the migration file;
- the dry-run output from Step 2 verbatim;
- an explicit statement that it has **not** been applied and that `apply_migration` was not called;
- that Tasks 3 onward are blocked until they apply it.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260904120000_demo_readonly_role.sql
git commit -m "feat(db): demo_readonly role and organizations.is_demo

SELECT-only Postgres role for the public demo identity. Grants sit below
RLS, so writes and SECURITY DEFINER RPCs are both denied with no policy
edits and no second tenant-resolution path. Unapplied — hand-off to human.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Wait for the human to confirm the migration is applied**

Do not start Task 3 until they say so.

---

## Task 3: Provision the demo-visitor identity

**Files:**
- Create: `scripts/seed/lib/demo-visitor.ts`
- Modify: `scripts/seed/create-demo-org.ts`
- Modify: `src/lib/env/validate-env.ts`

**Interfaces:**
- Consumes: `ensureDemoOrg(): Promise<{ orgId: string; orgCreated: boolean }>` and `DEMO_ORG_NAME` from `scripts/seed/lib/demo-org.ts`; `createAdminClient()` from `scripts/seed/lib/clients.ts`.
- Produces: `ensureDemoVisitor(orgId: string): Promise<{ userId: string; created: boolean }>` — used by `create-demo-org.ts` and referenced by Task 4's test.

- [ ] **Step 1: Add the env vars to the .env file**

Add to `.env` locally, and tell the human to add the same two to Vercel's Production **and** Preview scopes (this project has had scope-divergence incidents before):

```
DEMO_VISITOR_EMAIL=tekguyz.demo.visitor@example.com
DEMO_VISITOR_PASSWORD=<generate a long random password>
```

- [ ] **Step 2: Register them as required**

In `src/lib/env/validate-env.ts`, add to the `REQUIRED_ENV_VARS` array, after the `NEXT_PUBLIC_APP_URL` entry:

```typescript
  { name: "DEMO_VISITOR_EMAIL", description: "Public read-only demo identity's email" },
  { name: "DEMO_VISITOR_PASSWORD", description: "Public read-only demo identity's password" },
```

- [ ] **Step 3: Write the provisioning module**

Create `scripts/seed/lib/demo-visitor.ts`:

```typescript
import { createAdminClient } from "./clients";

// The public demo identity. Distinct from tekguyz.demo.owner@example.com in
// demo-org.ts, which stays OWNER and is untouched: an OWNER can read
// webhook_secret and change org settings, which a stranger must never do.
//
// This account holds role 'MEMBER' in organization_members — that column is
// about tenant permissions and is deliberately unchanged. Its inability to
// write comes from somewhere else entirely: the demo_readonly Postgres role
// in its JWT, which holds SELECT and nothing else (migration
// 20260904120000_demo_readonly_role.sql).
//
// Credentials come from the environment, never from source, matching how
// PLATFORM_RESEND_API_KEY and PLATFORM_GEMINI_API_KEY are handled.
const DB_ROLE = "demo_readonly";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env and to every Vercel environment scope this project deploys to.`,
    );
  }
  return value;
}

export async function ensureDemoVisitor(orgId: string): Promise<{ userId: string; created: boolean }> {
  const email = requireEnv("DEMO_VISITOR_EMAIL");
  const password = requireEnv("DEMO_VISITOR_PASSWORD");
  const admin = createAdminClient();

  let userId: string | null = null;
  let created = false;

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // pre-confirmed — no email sent, sidesteps the auth rate limit
    user_metadata: {
      seed_script: true,
      purpose: "Public read-only demo visitor — powerless by grant, not by UI",
    },
  });

  if (createdUser?.user) {
    userId = createdUser.user.id;
    created = true;
  } else if (createError && /already.*(registered|exists)/i.test(createError.message)) {
    const { data: list, error: listError } = await admin.auth.admin.listUsers();
    if (listError) throw new Error(`Failed to list users: ${listError.message}`);
    userId = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
    if (!userId) throw new Error(`${email} reported as existing but was not found in listUsers.`);
  } else {
    throw new Error(`Failed to create demo visitor: ${createError?.message}`);
  }

  // The whole mechanism. GoTrue copies auth.users.role into the JWT's `role`
  // claim, and PostgREST does `set local role <that claim>` — so this one line
  // is what makes every write fail with "permission denied for table ...".
  // Re-asserted on every run, not only on creation, so a manual change in the
  // Supabase dashboard cannot silently leave the account writable.
  const { error: roleError } = await admin.auth.admin.updateUserById(userId, {
    role: DB_ROLE,
  } as { role: string });
  if (roleError) {
    throw new Error(`Failed to set ${email}'s database role to ${DB_ROLE}: ${roleError.message}`);
  }

  // Exactly one membership row, in the demo org only. This is the entire
  // tenant boundary: private.current_org_ids() reads this table, so an org
  // with no row here is invisible to this identity.
  const { error: memberError } = await admin
    .from("organization_members")
    .upsert(
      { organization_id: orgId, user_id: userId, role: "MEMBER" },
      { onConflict: "organization_id,user_id" },
    );
  if (memberError) {
    throw new Error(`Failed to add demo visitor to org ${orgId}: ${memberError.message}`);
  }

  return { userId, created };
}
```

- [ ] **Step 4: Mark the demo org, and call the provisioner**

In `scripts/seed/create-demo-org.ts`, add the import beside the existing ones:

```typescript
import { ensureDemoVisitor } from "./lib/demo-visitor";
```

Then, immediately after the `console.log(orgCreated ? ... : ...)` line and before the lead-count check, insert:

```typescript
  // Marks this org for the weekly-report cron's exclusion and the voice
  // transcription skip. Re-asserted every run so a restored backup or a manual
  // edit cannot leave the demo org receiving real report emails again.
  const { error: markError } = await createAdminClient()
    .from("organizations")
    .update({ is_demo: true })
    .eq("id", orgId);
  if (markError) {
    throw new Error(`Failed to mark org ${orgId} as is_demo: ${markError.message}`);
  }
  console.log(`Marked ${orgId} as is_demo — excluded from the weekly-report cron.`);

  const { userId: visitorId, created: visitorCreated } = await ensureDemoVisitor(orgId);
  console.log(
    visitorCreated
      ? `Created read-only demo visitor ${visitorId}.`
      : `Found existing read-only demo visitor ${visitorId} — role and membership re-asserted.`,
  );
```

Add `createAdminClient` to that file's imports:

```typescript
import { createAdminClient } from "./lib/clients";
```

- [ ] **Step 5: Replace the now-obsolete cron warning**

That file's closing `console.log` currently warns that the weekly cron will email this org and suggests adding an `is_demo` exclusion. Task 6 builds exactly that. Replace the string:

```typescript
  console.log(
    `\nRun \`npm run seed:demo:reset\` to wipe and reseed fresh.` +
      `\n\nThis org is marked is_demo, so the weekly revenue cron skips it — no report email is ` +
      `generated for or sent to the demo account, and no Gemini narrative is billed for it.`,
  );
```

- [ ] **Step 6: Run the seed and verify**

Run: `npm run seed:demo`

Expected output includes `Marked <uuid> as is_demo` and a `demo visitor` line. The `[safety:before]` / `[safety:after]` lines must show the real TEKGUYZ org's lead count unchanged.

- [ ] **Step 7: Confirm the role claim actually landed**

Run this one-off check (delete the file afterwards) — it is the difference between "the code ran" and "the mechanism works":

```bash
npx tsx --env-file=.env -e "
const { createClient } = require('@supabase/supabase-js');
(async () => {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email: process.env.DEMO_VISITOR_EMAIL, password: process.env.DEMO_VISITOR_PASSWORD });
  if (error) throw error;
  const claims = JSON.parse(Buffer.from(data.session.access_token.split('.')[1], 'base64url').toString());
  console.log('role claim:', claims.role);
})();
"
```

Expected: `role claim: demo_readonly`. If it says `authenticated`, stop — Task 1's finding did not hold in practice, and nothing after this point is trustworthy.

- [ ] **Step 8: Commit**

```bash
git add scripts/seed/lib/demo-visitor.ts scripts/seed/create-demo-org.ts src/lib/env/validate-env.ts
git commit -m "feat(seed): provision the read-only demo visitor identity

Creates the demo-visitor auth user from DEMO_VISITOR_EMAIL/PASSWORD, sets
its JWT role claim to demo_readonly, and gives it exactly one
organization_members row in TEKGUYZ Demo. Marks that org is_demo. The
existing demo OWNER account is untouched.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Prove it — the live RLS suite

This is the task the whole design exists to satisfy. Written before the route, so the guarantee is proven before anything public points at it.

**Files:**
- Create: `src/lib/demo/demo-visitor.rls.test.ts`

**Interfaces:**
- Consumes: the applied migration, and the identity from Task 3.
- Produces: nothing other tasks import. It is the gate on Tasks 5–7.

- [ ] **Step 1: Write the failing test**

Create `src/lib/demo/demo-visitor.rls.test.ts`:

```typescript
// Live enforcement suite for the public read-only demo identity
// (migration 20260904120000_demo_readonly_role.sql).
//
// NOT part of `npm test` — run it with `npm run test:rls`. It talks to the
// real Supabase project, because that is the only place the enforcement
// exists: a Postgres role's grants are a database fact, and a mocked check
// would prove nothing about them.
//
// Unlike the other suites in this project, this one deliberately does NOT use
// disposable fixtures for the identity under test. The thing that ships is the
// real seeded demo visitor against the real TEKGUYZ Demo org, and a stand-in
// with the same role would not prove that THIS account is safe. It creates no
// rows on the happy path — every write it attempts is expected to fail — and
// afterAll deletes anything that got through, which would also be a test
// failure.
//
// If every write test fails by SUCCEEDING, the migration has not been applied
// or the role claim did not land. Check `npm run seed:demo` output first.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
const DEMO_EMAIL = process.env.DEMO_VISITOR_EMAIL;
const DEMO_PASSWORD = process.env.DEMO_VISITOR_PASSWORD;

const DEMO_ORG_NAME = "TEKGUYZ Demo";
const REAL_ORG_NAME = "TEKGUYZ";
const PROBE_MARKER = `rls-demo-probe-${Math.random().toString(36).slice(2, 10)}`;

let admin: SupabaseClient;
let demo: SupabaseClient;
let demoOrgId: string;
let realOrgId: string;
let demoUserId: string;
let seededLeadId: string;
let seededTaskId: string | null = null;
let seededProspectId: string;

beforeAll(async () => {
  for (const [name, value] of Object.entries({
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ANON_KEY,
    SUPABASE_SECRET_KEY: SERVICE_KEY,
    DEMO_VISITOR_EMAIL: DEMO_EMAIL,
    DEMO_VISITOR_PASSWORD: DEMO_PASSWORD,
  })) {
    if (!value) throw new Error(`${name} is not set — this suite needs the real project.`);
  }

  admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: orgs, error: orgError } = await admin
    .from("organizations")
    .select("id, name")
    .in("name", [DEMO_ORG_NAME, REAL_ORG_NAME]);
  if (orgError) throw new Error(`Failed to look up orgs: ${orgError.message}`);

  demoOrgId = orgs!.find((o) => o.name === DEMO_ORG_NAME)!.id;
  realOrgId = orgs!.find((o) => o.name === REAL_ORG_NAME)!.id;

  const { data: lead } = await admin
    .from("leads").select("id").eq("organization_id", demoOrgId).limit(1).single();
  seededLeadId = lead!.id;

  const { data: task } = await admin
    .from("tasks").select("id").eq("organization_id", demoOrgId).limit(1).maybeSingle();
  seededTaskId = task?.id ?? null;

  const { data: prospect } = await admin
    .from("prospects").select("id").eq("organization_id", demoOrgId).limit(1).single();
  seededProspectId = prospect!.id;

  demo = createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: signInError } = await demo.auth.signInWithPassword({
    email: DEMO_EMAIL!,
    password: DEMO_PASSWORD!,
  });
  if (signInError || !session.session) {
    throw new Error(`demo visitor sign-in failed: ${signInError?.message}`);
  }
  demoUserId = session.user!.id;
});

afterAll(async () => {
  // Only reachable if a write test failed by succeeding. Removing it is part
  // of this unit of work, not a separate cleanup chore.
  if (!admin) return;
  await admin.from("activity_logs").delete().eq("content", PROBE_MARKER);
  await admin.from("leads").delete().eq("client_name", PROBE_MARKER);
  await admin.from("tasks").delete().eq("title", PROBE_MARKER);
  await admin.from("prospects").delete().eq("name", PROBE_MARKER);
});

describe("the demo visitor carries the demo_readonly role", () => {
  it("has role: demo_readonly in its access token", async () => {
    const { data } = await demo.auth.getSession();
    const claims = JSON.parse(
      Buffer.from(data.session!.access_token.split(".")[1], "base64url").toString("utf8"),
    );
    expect(claims.role).toBe("demo_readonly");
  });
});

describe("assertion 1: it can read the seeded demo data", () => {
  it("reads leads", async () => {
    const { data, error } = await demo.from("leads").select("id, client_name");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("reads prospects", async () => {
    const { data, error } = await demo.from("prospects").select("id, name");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("reads activity logs", async () => {
    const { data, error } = await demo.from("activity_logs").select("id, content");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("reads tasks without error", async () => {
    const { error } = await demo.from("tasks").select("id, title");
    expect(error).toBeNull();
  });
});

describe("assertion 2: every write is denied by the database", () => {
  it("denies INSERT on leads", async () => {
    const { error } = await demo.from("leads").insert({
      organization_id: demoOrgId,
      client_name: PROBE_MARKER,
      email: `${PROBE_MARKER}@example.com`,
      status: "NEW",
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied/i);
  });

  it("denies UPDATE on leads", async () => {
    const { error } = await demo
      .from("leads").update({ client_name: PROBE_MARKER }).eq("id", seededLeadId);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied/i);
  });

  it("denies DELETE on leads", async () => {
    const { error } = await demo.from("leads").delete().eq("id", seededLeadId);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied/i);
  });

  it("denies INSERT on activity_logs", async () => {
    const { error } = await demo.from("activity_logs").insert({
      organization_id: demoOrgId,
      lead_id: seededLeadId,
      log_type: "MANUAL_NOTE",
      content: PROBE_MARKER,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied/i);
  });

  it("denies INSERT on tasks", async () => {
    const { error } = await demo.from("tasks").insert({
      organization_id: demoOrgId,
      lead_id: seededLeadId,
      title: PROBE_MARKER,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied/i);
  });

  it("denies UPDATE on tasks", async () => {
    if (!seededTaskId) return; // no seeded task to aim at; INSERT above already proves the grant
    const { error } = await demo.from("tasks").update({ title: PROBE_MARKER }).eq("id", seededTaskId);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied/i);
  });

  it("denies INSERT on prospects", async () => {
    const { error } = await demo.from("prospects").insert({
      organization_id: demoOrgId,
      place_id: `${PROBE_MARKER}-place`,
      name: PROBE_MARKER,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied/i);
  });

  it("denies UPDATE on prospects", async () => {
    const { error } = await demo
      .from("prospects").update({ name: PROBE_MARKER }).eq("id", seededProspectId);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied/i);
  });

  it("denies INSERT on lead_submissions", async () => {
    const { error } = await demo.from("lead_submissions").insert({
      organization_id: demoOrgId,
      lead_id: seededLeadId,
      message: PROBE_MARKER,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied/i);
  });

  it("denies UPDATE on organizations", async () => {
    const { error } = await demo
      .from("organizations").update({ name: PROBE_MARKER }).eq("id", demoOrgId);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied/i);
  });

  it("denies UPDATE on its own organization_members row", async () => {
    const { error } = await demo
      .from("organization_members")
      .update({ notify_new_lead: false })
      .eq("user_id", demoUserId);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied/i);
  });

  it("denies every SECURITY DEFINER write RPC", async () => {
    const calls: Array<[string, Record<string, unknown>]> = [
      ["import_prospects_chunk", { p_org_id: demoOrgId, p_rows: [] }],
      ["import_leads_chunk", { p_org_id: demoOrgId, p_rows: [] }],
      ["create_organization_with_owner", { p_name: PROBE_MARKER }],
      ["vault_set_org_credential", { p_org_id: demoOrgId, p_field: "api_key_gemini", p_value: "x" }],
    ];
    for (const [fn, args] of calls) {
      const { error } = await demo.rpc(fn, args);
      expect(error, `${fn} should be denied`).not.toBeNull();
      expect(error!.message, `${fn} error text`).toMatch(/permission denied|does not exist|not find/i);
    }
  });
});

describe("assertion 3: exactly one membership row, not the real org", () => {
  it("holds one organization_members row, in TEKGUYZ Demo", async () => {
    const { data, error } = await admin
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", demoUserId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].organization_id).toBe(demoOrgId);
    expect(data![0].organization_id).not.toBe(realOrgId);
  });
});

describe("assertion 4: it cannot read the webhook secret", () => {
  it("is denied get_org_webhook_secret", async () => {
    const { error } = await demo.rpc("get_org_webhook_secret", { p_org_id: demoOrgId });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied|does not exist|not find/i);
  });

  it("cannot select webhook_secret off the organizations row", async () => {
    const { data, error } = await demo
      .from("organizations").select("webhook_secret").eq("id", demoOrgId);
    // Either the column read is refused, or it returns nothing. Both are fine;
    // a returned secret is not.
    if (!error) {
      expect(data?.[0]?.webhook_secret).toBeUndefined();
    }
  });
});

describe("assertion 5: the real TEKGUYZ org is invisible", () => {
  it("returns zero leads for the real org", async () => {
    const { data, error } = await demo
      .from("leads").select("id").eq("organization_id", realOrgId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("returns zero rows for the real org itself", async () => {
    const { data, error } = await demo
      .from("organizations").select("id").eq("id", realOrgId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("returns zero prospects for the real org", async () => {
    const { data, error } = await demo
      .from("prospects").select("id").eq("organization_id", realOrgId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run it and read the result honestly**

Run: `npm run test:rls`

Every test must pass. Paste the **actual output** in the task report — not a summary, not "verified". If a write test fails because the write **succeeded**, the mechanism is broken: stop, and use `superpowers:systematic-debugging` rather than adjusting the test.

- [ ] **Step 3: Confirm no residue**

Run: `npm run check:residue`

Expected: no rows matching the probe marker. The `afterAll` should have handled it; this is the independent check.

- [ ] **Step 4: Commit**

```bash
git add src/lib/demo/demo-visitor.rls.test.ts
git commit -m "test(rls): prove the demo visitor can read but never write

Live suite against the real seeded identity: reads the demo org, is denied
every INSERT/UPDATE/DELETE and every SECURITY DEFINER write RPC, holds one
membership row, cannot reach webhook_secret, and sees zero rows of the real
TEKGUYZ org.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: The `/demo` entry route

**Files:**
- Create: `src/app/demo/route.ts`
- Modify: `src/lib/supabase/middleware.ts`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase/server`; `DEMO_VISITOR_EMAIL` / `DEMO_VISITOR_PASSWORD`.
- Produces: the public URL `/demo`.

- [ ] **Step 1: Write the route**

Create `src/app/demo/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PUBLIC. Signs in the read-only demo identity and redirects into the app, so
// tekguyz.com's case study can link straight to a working instance instead of
// dead-ending an anonymous visitor on /login.
//
// WHY THIS HAS NO NODE_ENV GUARD, WHILE /api/dev-login KEEPS ITS ONE.
// dev-login signs in the demo OWNER — an identity that can read
// webhook_secret, change org settings and manage members. That is dangerous,
// so it is allowlisted to development and must stay that way; do not reuse
// this file's reasoning to loosen it.
//
// The identity behind THIS route holds the demo_readonly Postgres role, which
// has SELECT and nothing else (migration 20260904120000_demo_readonly_role.sql).
// Every INSERT/UPDATE/DELETE and every SECURITY DEFINER RPC is denied below
// RLS, and it holds exactly one organization_members row, in TEKGUYZ Demo.
// Publishing this route therefore grants a stranger precisely the read access
// the case study is already advertising, and nothing more. Proven, not
// assumed: src/lib/demo/demo-visitor.rls.test.ts.
//
// A side effect on GET is deliberate. Signing in is idempotent and mutates
// nothing, so a link prefetcher that hits this mints a throwaway token and
// changes no state. A POST behind an interstitial page would cost the visitor
// a second click and buy nothing.
export async function GET() {
  const email = process.env.DEMO_VISITOR_EMAIL?.trim();
  const password = process.env.DEMO_VISITOR_PASSWORD?.trim();

  // Fail loudly rather than 500-ing on an undefined credential. A deploy
  // missing these is a configuration bug, not a visitor's problem.
  if (!email || !password) {
    return new NextResponse(
      "The demo is not configured for this deployment.",
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[/demo] demo visitor sign-in failed:", error.message);
    return new NextResponse("The demo is temporarily unavailable.", { status: 503 });
  }

  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL));
}
```

- [ ] **Step 2: Allowlist it in middleware**

In `src/lib/supabase/middleware.ts`, immediately after the `isApiRoute` block, add:

```typescript
  // The public demo entry point. It is NOT under /api/, so it needs naming
  // here — and naming it explicitly is the point: this is a deliberate
  // exemption for a route whose identity holds no privileges, not an
  // incidental one inherited from a path prefix. See src/app/demo/route.ts.
  const isDemoEntryRoute = path === "/demo";
```

Then extend the redirect condition:

```typescript
  if (!user && !isAuthRoute && !isApiRoute && !isPublicMetadataRoute && !isDemoEntryRoute) {
```

- [ ] **Step 3: Verify it works, signed out, in a production build**

`next dev` is fine for this one because no navigation timing is being measured. Run `npm run dev`, then in a **fresh private window** (no session cookie):

```bash
curl -i -s http://localhost:3000/demo | head -20
```

Expected: `HTTP/1.1 307` (or 302) with a `location:` header pointing at `/`, and `set-cookie` headers carrying the Supabase session. Paste the real output.

- [ ] **Step 4: Verify the landing page shows seeded data**

Open the Browser pane at `http://localhost:3000/demo`. Expected: it redirects to `/` and the dashboard renders seeded leads. Take a screenshot.

- [ ] **Step 5: Verify a write is refused by the database, not the UI**

In the browser, try to add a note to any lead. Expected: it fails, and `read_network_requests` shows a `permission denied` response body — **not** a disabled button. Paste the actual response. This is the definition-of-done item that a screenshot cannot satisfy.

- [ ] **Step 6: Check whether Storage honours `demo_readonly`**

Spec § 10a flags this as an open risk: Supabase Storage is a separate service
with its own JWT handling and may assume the `authenticated` role regardless of
the `grant select on storage.objects` in the migration. Find out now, so Task 8
has a real finding to record rather than a guess.

```bash
npx tsx --env-file=.env -e "
const { createClient } = require('@supabase/supabase-js');
(async () => {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { error: e } = await c.auth.signInWithPassword({ email: process.env.DEMO_VISITOR_EMAIL, password: process.env.DEMO_VISITOR_PASSWORD });
  if (e) throw e;
  const list = await c.storage.from('audio-notes').list();
  console.log('STORAGE LIST error:', list.error?.message ?? 'none');
  console.log('STORAGE LIST rows:', list.data?.length ?? 0);
})();
"
```

Record the output verbatim for Task 8 Step 5. **Either result is acceptable and
neither changes the code.** The seeded demo data contains no audio notes, so a
failure costs the demo nothing. **Do not widen the role's grants to make this
work** — the spec's disposition is to register it as a gap.

- [ ] **Step 7: Verify noindex**

The route returns a redirect with no HTML, so there is nothing to index. Show it:

```bash
curl -i -s http://localhost:3000/demo | grep -i "^HTTP\|^location\|content-type"
```

Then confirm the destination carries the app-wide rule — `src/app/layout.tsx:38` sets `robots: { index: false, follow: false }`, which every page under the root layout inherits. Quote the line in the report.

- [ ] **Step 8: Commit**

```bash
git add src/app/demo/route.ts src/lib/supabase/middleware.ts
git commit -m "feat: public /demo entry point for the read-only demo identity

One GET, one redirect, no interstitial. Explicitly allowlisted in middleware
rather than inheriting the /api/ exemption. /api/dev-login's NODE_ENV guard
is untouched — its identity is an OWNER and stays development-only.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Fix the weekly-report email leak

An independent bug: the cron sweeps every org, so `TEKGUYZ Demo` gets a Gemini narrative billed and a Resend email sent to a fake `@example.com` address every week. It lands regardless of the rest of this plan.

**Files:**
- Create: `src/lib/demo/is-demo-org.ts`
- Modify: `src/app/api/cron/weekly-report/route.ts:19`

**Interfaces:**
- Produces: `isDemoOrg(organizationId: string): Promise<boolean>` — also consumed by Task 7.

- [ ] **Step 1: Write the shared helper**

Create `src/lib/demo/is-demo-org.ts`:

```typescript
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Single source of truth for "is this the public demo tenant". Keyed on the
// organization rather than on a user id, so it still holds if a second demo
// identity is ever added. Two consumers today: the weekly-report cron's org
// sweep, and the voice-transcription skip.
//
// Service-role client: organizations.is_demo must be readable for an org the
// caller may not be a member of (the cron runs with no user at all).
export async function isDemoOrg(organizationId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("is_demo")
    .eq("id", organizationId)
    .maybeSingle();

  // Fail closed toward "treat it as a demo" is WRONG here — that would silence
  // a real org's weekly report on a transient error. Fail toward "not a demo",
  // and let the existing per-org try/catch handle anything downstream.
  if (error || !data) return false;
  return data.is_demo === true;
}
```

- [ ] **Step 2: Exclude demo orgs from the sweep**

In `src/app/api/cron/weekly-report/route.ts`, change line 19 from:

```typescript
  const { data: organizations, error } = await supabase.from("organizations").select("id");
```

to:

```typescript
  // is_demo orgs are excluded here, not skipped inside the loop, so nothing
  // downstream runs for them at all — no aggregation, no Gemini narrative, no
  // Resend send. TEKGUYZ Demo's owner is a fake @example.com address, so every
  // weekly send for it was a bounced email and a billed narrative. No other
  // organization's behaviour changes: is_demo defaults to false.
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("is_demo", false);
```

- [ ] **Step 3: Prove the filter selects the right orgs**

Run a SELECT-only check:

```bash
npx tsx --env-file=.env -e "
const { createClient } = require('@supabase/supabase-js');
(async () => {
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const all = await a.from('organizations').select('id, name, is_demo');
  console.log('ALL ORGS:', all.data);
  const swept = await a.from('organizations').select('id, name').eq('is_demo', false);
  console.log('SWEPT BY CRON:', swept.data);
})();
"
```

Expected: `TEKGUYZ Demo` appears in `ALL ORGS` with `is_demo: true` and is **absent** from `SWEPT BY CRON`; every other org, `TEKGUYZ` included, appears in both. Paste both lists.

- [ ] **Step 4: Run the full unit suite**

Run: `npx vitest run`

Expected: all pass. The cron route has no existing unit test; this confirms nothing else broke.

- [ ] **Step 5: Commit**

```bash
git add src/lib/demo/is-demo-org.ts src/app/api/cron/weekly-report/route.ts
git commit -m "fix(cron): exclude demo orgs from the weekly-report sweep

TEKGUYZ Demo's owner is a fake @example.com address, so every weekly run
billed a Gemini narrative and posted a Resend send that could only bounce.
Flagged by create-demo-org.ts's own output when the demo org was built and
never fixed. is_demo defaults to false, so no other org changes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: Belt-and-braces — skip Gemini transcription for the demo org

Structurally unreachable already: the storage upload and the `activity_logs` insert both fail on grant before Gemini is touched. Added anyway so the guarantee does not depend on the grant being right, and so it holds whether or not `PLATFORM_GEMINI_API_KEY` is set.

**Files:**
- Modify: `src/lib/activity/audio-transcription.ts`

**Interfaces:**
- Consumes: `isDemoOrg(organizationId: string): Promise<boolean>` from Task 6.

- [ ] **Step 1: Add the import**

In `src/lib/activity/audio-transcription.ts`, beside the existing imports:

```typescript
import { isDemoOrg } from "@/lib/demo/is-demo-org";
```

- [ ] **Step 2: Add the constant**

Beside `TRANSCRIPTION_PROMPT`:

```typescript
const DEMO_SKIP_MESSAGE = "Voice notes are not transcribed in the public demo.";
```

- [ ] **Step 3: Skip before the credential is resolved**

In `transcribeAndSaveAudioNote`, immediately after `const organizationId: string = lead.organization_id;`, insert:

```typescript
  // Belt and braces. The public demo identity holds the demo_readonly role,
  // so it cannot insert an activity_logs row or upload to storage and can
  // never reach this function at all — but a stranger's recording must not be
  // able to spend Gemini credit even if that grant is ever loosened by
  // mistake. Placed BEFORE resolveOrgCredential so it holds regardless of
  // whether PLATFORM_GEMINI_API_KEY is set in the environment.
  const isDemo = await isDemoOrg(organizationId);
```

Then change the transcription call so the demo path never reaches Gemini. Replace:

```typescript
  const content = await transcribeOrFallback(organizationId, buffer, mimeType);
```

with:

```typescript
  const content = isDemo
    ? DEMO_SKIP_MESSAGE
    : await transcribeOrFallback(organizationId, buffer, mimeType);
```

- [ ] **Step 4: Write the failing test**

**Read this before writing it.** The obvious test — mock `isDemoOrg` and
`resolveOrgCredential`, call the function, assert the resolver was never hit —
is not worth its cost here. `transcribeAndSaveAudioNote` calls `createClient()`
from `@/lib/supabase/server`, which pulls in `next/headers`, and **no test in
this repo mocks that module today** (verified: zero matches). Writing the first
one, to cover a three-line guard on a path the demo identity provably cannot
reach, is disproportionate — and a test that mocks everything the function
touches proves the mocks work, not the code.

What can actually regress is **ordering**: someone moves the `isDemoOrg` check
below `resolveOrgCredential`, and the guard silently stops holding when
`PLATFORM_GEMINI_API_KEY` is set. That is testable directly, with no mocks, and
it follows the precedent already set by `src/components/ui/dropdown-menu.test.tsx`,
which catches a regression at the source level rather than by rendering.

Create `src/lib/activity/audio-transcription.test.ts`:

```typescript
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Source-level guard, deliberately. The real proof that the public demo cannot
// spend Gemini credit is src/lib/demo/demo-visitor.rls.test.ts, which shows the
// demo identity cannot insert an activity_logs row or upload to storage and so
// never reaches this function at all.
//
// What this file protects is the ONE thing that can silently regress: the
// is_demo check sitting BEFORE the credential is resolved. If someone reorders
// them, nothing fails — the app builds, every other test passes, and the guard
// quietly stops holding whenever PLATFORM_GEMINI_API_KEY is set. That is the
// same silent-failure shape as the `outline-none` regression this project
// already guards at the source level in dropdown-menu.test.tsx.
const SOURCE = readFileSync(
  fileURLToPath(new URL("./audio-transcription.ts", import.meta.url)),
  "utf8",
);

describe("the demo transcription guard", () => {
  it("checks is_demo before resolving any Gemini credential", () => {
    const guardAt = SOURCE.indexOf("isDemoOrg(organizationId)");
    const resolveAt = SOURCE.indexOf("resolveOrgCredential(");

    expect(guardAt, "isDemoOrg(organizationId) call not found").toBeGreaterThan(-1);
    expect(resolveAt, "resolveOrgCredential( call not found").toBeGreaterThan(-1);
    expect(
      guardAt,
      "the is_demo guard must run BEFORE resolveOrgCredential, or it stops holding when PLATFORM_GEMINI_API_KEY is set",
    ).toBeLessThan(resolveAt);
  });

  it("returns the demo message instead of transcribing", () => {
    expect(SOURCE).toContain("Voice notes are not transcribed in the public demo.");
    expect(SOURCE).toMatch(/isDemo\s*\?\s*DEMO_SKIP_MESSAGE/);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails, then passes**

Run it **before** Steps 1–3's edits are in place:

```bash
npx vitest run src/lib/activity/audio-transcription.test.ts
```

Expected: FAIL — `isDemoOrg(organizationId) call not found`.

Then apply Steps 1–3 and run it again. Expected: PASS, 2 tests.

If it passes before the edits, the test is not testing anything — stop and fix
the test, not the code.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/activity/audio-transcription.ts src/lib/activity/audio-transcription.test.ts
git commit -m "feat: never call Gemini for a demo org's voice note

The demo identity cannot reach this path at all (no INSERT or storage
grant), but the skip does not depend on that grant being right, and it sits
before resolveOrgCredential so it holds whether or not
PLATFORM_GEMINI_API_KEY is set.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: Documentation and close-out

**Files:**
- Modify: `docs/ROADMAP.md`, `docs/KNOWN_GAPS.md`, `CLAUDE.md`, `docs/ADDENDA_LOG.md`, `docs/SCHEMA_REFERENCE.md`
- Create: `docs/addenda/2026-09.md`

- [ ] **Step 1: Update `docs/ROADMAP.md` P1**

Do **not** add a second copy of this plan. Amend the existing P1 entry to record that its public-route piece is done and the rest is still open:

```markdown
- **P1 — Login/landing redesign.** Partially shipped 2026-09-04: the public
  entry route now exists as `/demo`, a read-only demo identity that closes the
  "no genuinely public route" half of this item (CLAUDE.md § 3, and
  `docs/addenda/2026-09.md` § 2026-09-04). **Still open:** the redesigned
  `/login`, the pre-auth marketing landing page, and the onboarding experience
  (the `/onboarding` route exists but was never designed). The `robots: noindex`
  revisit trigger recorded in `docs/KNOWN_GAPS.md` is now live — `/demo` is a
  public route — but was deliberately not acted on; see that file.
```

- [ ] **Step 2: Add the addendum and index it**

Create `docs/addenda/2026-09.md` with a `## 2026-09-04 — The public read-only demo identity` section covering: the mechanism chosen and why (Postgres role vs the 18-site VIEWER alternative), the "no policy carries a TO clause" finding that made it cheap, the JWT role-claim mechanism from Task 1, the cron leak that was fixed as an independent bug, and the strict-read-only voice memo decision.

Then add its index row to `docs/ADDENDA_LOG.md`. **A section absent from the index is unreachable** — this is checked by `check-section-pointers.mjs`.

- [ ] **Step 3: Add the § 3 initiative row to `CLAUDE.md`**

One row in the § 3 table, status only. Narrative goes in the addendum, not here.

- [ ] **Step 4: Update `docs/SCHEMA_REFERENCE.md`**

Add a dated addendum section recording the `demo_readonly` role, its exact grant list, and `organizations.is_demo`. This file is the live-schema reference; a role with grants that is absent from it is exactly the drift it exists to prevent.

- [ ] **Step 5: Register what was not built in `docs/KNOWN_GAPS.md`**

Read that file's own maintenance rules first, then add:

- The demo identity cannot write, so the seeded demo shows no "create a lead" flow. Deliberate, not an oversight.
- Whether Supabase Storage honours `demo_readonly` for audio playback — record Task 5 Step 6's actual output. If it is broken: registered, **not** fixed by widening grants.
- `robots: noindex` still covers `/demo`. The revisit trigger recorded in this file has now fired, and the decision to keep noindex was deliberate: the tekguyz.com case study is what should rank.

- [ ] **Step 6: Run the doc checks**

Run: `npm run check:docs`

Expected: all three checkers pass. Fix anything they flag before continuing.

- [ ] **Step 7: Full definition-of-done sweep**

```bash
npm run lint
npx tsc --noEmit
npx vitest run
npm run test:rls
npm run build
```

All five must pass. Paste the tail of each.

- [ ] **Step 8: Confirm the untouched paths, by filename**

```bash
git diff --stat main...HEAD -- src/app/api/v1/ src/lib/webhooks/ src/app/api/dev-login/
```

Expected: **empty output.** Paste it. If it is not empty, stop and report.

- [ ] **Step 9: Commit**

```bash
git add docs/ CLAUDE.md
git commit -m "docs: record the public demo identity across ROADMAP, gaps and schema

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 10: Report**

State plainly, per the brief's reporting contract:

1. The exact read-only mechanism and why it beat the role-value alternative.
2. Whether a migration was required, plus the dry-run command and output verbatim.
3. The exact `npm run test:rls` command and its **pasted** output — not a claim.
4. Confirmation by filename that nothing under the webhook/triage path changed (Step 8's empty diff), and that tekguyz.com's live contact form is therefore unaffected.
5. **Confirmed, not assumed** — the two standing rules the brief asked about by name:
   - *A classifier verdict routes a lead, it never hides one.* The spam shield runs only on the webhook path, which is HMAC-authenticated against `organizations.webhook_secret`. `get_org_webhook_secret` is OWNER/ADMIN-gated **and** unreachable for `demo_readonly` (no `EXECUTE` grant) — proven by Task 4's assertion 4. The demo identity cannot trigger a classifier at all.
   - *Archiving is not removal.* `leads.archived` is OWNER/ADMIN-only via the Prompt-14 trigger **and** `demo_readonly` holds no `UPDATE` grant on `leads` — proven by Task 4's "denies UPDATE on leads". This identity cannot archive anything, so it can leave no archived residue.
6. **Data safety, on the record.** Every seeded row is invented: all phone numbers are in the `555-01xx` block reserved for fiction, company names are transparently fake, email domains match their invented companies, and prospect `place_id`s are `demo-place-####`. **No real customer data is reachable from the demo identity** — for two independent reasons: the rows are synthetic, and Task 4's assertion 5 proves the real TEKGUYZ org returns zero rows.
7. What was deferred and why, and where it is registered.
8. The final URL: `https://tekguyz-crm.vercel.app/demo`.

Then remind the human of the two things only they can do: add `DEMO_VISITOR_EMAIL` and `DEMO_VISITOR_PASSWORD` to Vercel's Production **and** Preview scopes, and update `content/work.ts` in `C:/Projects/tekguyz-site`.
