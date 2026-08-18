-- Closes a stranded PENDING invite the moment a membership row appears for the
-- same (organization, email) — whatever wrote that membership row.
--
-- WHY THIS EXISTS
-- public.accept_organization_invite is the only *sanctioned* writer of
-- public.organization_members, but it is not the only *possible* one. A hand-run
-- INSERT in Supabase Studio, a service-role script, or a future code path that
-- forgets the RPC all bypass it. That happened on 2026-07-25: a manual insert
-- created the membership without ever moving the invite off PENDING, and that
-- row then occupied the partial unique index unique_pending_invite_per_org_email
-- and permanently blocked re-inviting that address. The two known rows were
-- repaired by hand and the UI now surfaces expired invites, but nothing in the
-- schema prevented or detected a recurrence. This trigger does.
-- Full history: docs/ADDENDA_LOG.md
--   § Accepted invites stuck at PENDING — Settings -> Team.
--
-- WHY A TRIGGER AND NOT A SWEEP
-- A scheduled expiry sweep solves a different problem (invites nobody ever
-- accepts), and the UI already surfaces those as expired. The failure here is
-- specifically "the membership exists but the invite never closed", which is
-- knowable the instant the membership row is written. Deliberately no cron.
--
-- WHY SECURITY DEFINER (unlike enforce_lead_role_restrictions, which is INVOKER)
-- public.organization_invites has RLS on, and its UPDATE policy requires the
-- caller to hold an OWNER/ADMIN membership row in that org. The whole point of
-- this trigger is to fire for writers that are NOT going through the RPC —
-- a Studio session, a service-role script, or some future path. A SECURITY
-- INVOKER function would silently no-op for exactly the callers that need it,
-- which is the same class of invisible failure the trigger exists to prevent.
-- search_path is pinned to public, matching the other privileged functions in
-- this schema (accept_organization_invite, create_organization_with_owner,
-- get_org_webhook_secret); every reference below is schema-qualified regardless.
--
-- RELATIONSHIP TO accept_organization_invite
-- Unchanged, on purpose. That RPC takes FOR UPDATE on the invite row before it
-- inserts the membership, so this trigger's UPDATE runs in the same transaction
-- against a lock the transaction already holds — no deadlock. The RPC's own
-- subsequent "UPDATE ... SET status = 'ACCEPTED'" then re-sets the value this
-- trigger just wrote. That overlap is expected and idempotent; do not "fix" it
-- by deleting either half.

create or replace function public.close_invite_on_member_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email text;
begin
    -- organization_members has no email column; auth.users is the only source.
    select u.email into v_email
    from auth.users u
    where u.id = new.user_id;

    -- Nullable in auth.users (phone-only identities). No address, no match.
    if v_email is null then
        return null;
    end if;

    -- lower() on both sides, for the same reason unique_tenant_client_email_ci
    -- exists on leads: Postgres compares TEXT byte-for-byte, so "Jane@x.com"
    -- and "jane@x.com" are two distinct invites. unique_pending_invite_per_org_
    -- email is itself case-SENSITIVE, so matching case-insensitively here is
    -- deliberately BROADER than that index — it also clears a case-mismatched
    -- stranded row, which is the one the index would otherwise keep blocking.
    --
    -- Three guards, all load-bearing:
    --   organization_id  — never touch another tenant's invite, same email or not
    --   status = PENDING — never rewrite an ACCEPTED or REVOKED row
    --   (no expiry test) — an expired-but-still-PENDING row is precisely what
    --                      occupies the unique index, so it must close too
    update public.organization_invites i
       set status = 'ACCEPTED'
     where i.organization_id = new.organization_id
       and lower(i.email) = lower(v_email)
       and i.status = 'PENDING';

    -- AFTER trigger: the return value is ignored by Postgres either way.
    return null;
end;
$$;

-- Not callable as an RPC, and should not appear as one. Postgres checks EXECUTE
-- on a trigger function at CREATE TRIGGER time, not at fire time, so revoking
-- here does not stop the trigger below from running. Verified by dry-run against
-- a pg_temp replica before this file was handed over.
revoke execute on function public.close_invite_on_member_insert() from public;

create or replace trigger trigger_close_invite_on_member_insert
    after insert on public.organization_members
    for each row
    execute function public.close_invite_on_member_insert();
