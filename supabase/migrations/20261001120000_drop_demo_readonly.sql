-- Demo standard, step 3 of 3 (#33, parent #29). Closes #21.
--
-- Retires the shared read-only demo. Each Guest now owns a Demo Org as its
-- OWNER (20260929120000_demo_org_per_guest.sql), so nothing signs in as
-- `demo_readonly` any more. Apply this only AFTER the code that stopped using
-- the role is deployed — #31 and #32 are.
--
-- Drops the role created by 20260904120000_demo_readonly_role.sql and the one
-- function grant added by 20260904130000_demo_readonly_members_rpc.sql.
--
-- Every grant is revoked by name, not with `drop owned by`. The role's whole
-- footprint was read from the live catalog before this was written: SELECT on
-- nine tables, EXECUTE on two functions, USAGE on three schemas, membership in
-- `authenticator` and `postgres`, and no default privileges. `drop role` fails
-- loudly if anything else still depends on it, and the migration rolls back.
--
-- `organizations.is_demo` stays: every Demo Org and "TEKGUYZ Demo" use it.
--
-- Guarded, so it is safe to re-run on a database where the role is already gone.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'demo_readonly') then
    revoke select on
        public.organizations,
        public.organization_members,
        public.organization_invites,
        public.leads,
        public.activity_logs,
        public.tasks,
        public.lead_submissions,
        public.prospects
      from demo_readonly;
    revoke select on storage.objects from demo_readonly;
    revoke execute on function public.get_organization_members(uuid) from demo_readonly;
    revoke execute on function private.current_org_ids() from demo_readonly;
    revoke usage on schema public, private, storage from demo_readonly;
    -- Dropping the role also removes its membership in `authenticator`.
    drop role demo_readonly;
  end if;
end
$$;
