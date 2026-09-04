-- Public read-only demo identity — the enforcement half.
--
-- Design: docs/superpowers/specs/2026-09-04-public-demo-design.md § 4.
-- Plan:   docs/superpowers/plans/2026-09-04-public-demo-entry.md Task 2.
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
--
-- How the role reaches a request: GoTrue copies auth.users.role into the JWT's
-- `role` claim and PostgREST does `set local role <that claim>`. Verified
-- against this live project on 2026-09-04 before this file was written — a
-- disposable user's claim moved from "authenticated" to "demo_readonly" after
-- a single admin updateUserById({ role }) call. No Custom Access Token Hook is
-- needed, and none should be added.

-- 1. THE ROLE
--
-- NOLOGIN: it is never connected to directly. PostgREST reaches it by doing
-- `set local role demo_readonly`, which is why `authenticator` must be able to
-- switch into it.
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
--
-- NOT added to LEAD_COLUMNS or any lead query — this is an organizations
-- column and no lead surface reads it.
alter table public.organizations
    add column is_demo boolean not null default false;
