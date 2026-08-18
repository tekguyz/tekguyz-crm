-- Team management: change a member's role, and remove a member from an org.
--
-- Closes the KNOWN_GAPS bullet "Team management is view-only beyond invites —
-- no role change or member removal", flagged 2026-07-25. Also closes the
-- member-removal half of the ownership gap opened this morning by
-- 20260818120000_leads_assigned_to.sql: removing somebody now releases the
-- leads they owned, which was not expressible before that column existed.
--
-- WHY TWO SECURITY DEFINER RPCS AND NOT RLS POLICIES
-- public.organization_members already writes exclusively through SECURITY
-- DEFINER functions (create_organization_with_owner, accept_organization_invite)
-- and has a SELECT policy only. That is not merely a convention here: the
-- `authenticated` role holds GRANT SELECT, INSERT on this table and **no UPDATE
-- or DELETE grant at all**, so the RPC-only path is enforced one level below
-- RLS — adding a policy would not even make a client write possible without
-- also widening the grant. These two functions extend that pattern rather than
-- opening a new door into the table.
--
-- Both re-resolve the CALLER's own role for the specific p_org_id passed in,
-- inside the function body, exactly as get_org_webhook_secret does. A
-- client-supplied org id is an argument, never a claim.
--
-- search_path is pinned to public, matching the three existing SECURITY DEFINER
-- functions on this table; every reference below is schema-qualified regardless.

-- Shared by both functions below. Returns the caller's role in p_org_id, or
-- NULL when they are not a member — so "not a member of that org" and "a MEMBER
-- of that org" are distinguishable, and a non-member can never be treated as
-- authorised by an accidental NULL comparison.
--
-- Its own function rather than a copy-pasted SELECT in each body: the two
-- callers must agree exactly on what "the caller's role here" means, and this
-- schema has already been bitten by a rule restated in two places drifting
-- apart. private, not public — it is not an API surface, and nothing outside
-- these two functions should be able to call it.
create or replace function private.caller_role_in_org(p_org_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
    select m.role
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid();
$$;

revoke execute on function private.caller_role_in_org(uuid) from public;

-- ---------------------------------------------------------------------------
-- change_member_role
-- ---------------------------------------------------------------------------
create or replace function public.change_member_role(
    p_org_id uuid,
    p_target_user_id uuid,
    p_new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_caller_role text;
    v_target_role text;
    v_owner_count int;
begin
    if auth.uid() is null then
        raise exception 'TEAM_NOT_AUTHORIZED: authentication required.'
            using errcode = '42501';
    end if;

    if p_new_role not in ('OWNER', 'ADMIN', 'MEMBER') then
        raise exception 'TEAM_INVALID_ROLE: role must be OWNER, ADMIN or MEMBER.'
            using errcode = '23514';
    end if;

    -- Lock the org's membership rows BEFORE reading any of them. The last-OWNER
    -- rule below is a count-then-act invariant: without this, two concurrent
    -- demotions could each observe two OWNERs, each conclude it is safe, and
    -- together leave the org with none. An aggregate cannot carry FOR UPDATE,
    -- so the lock is taken first and the count runs after. Membership sets are
    -- tiny and this serialises writers within a single org only.
    perform 1
    from public.organization_members
    where organization_id = p_org_id
    for update;

    v_caller_role := private.caller_role_in_org(p_org_id);

    -- Fail-closed: only an explicit OWNER/ADMIN membership row for THIS org
    -- passes. A caller who is not a member at all resolves to NULL and lands
    -- here, so a valid session for some other tenant proves nothing.
    if v_caller_role is null or v_caller_role not in ('OWNER', 'ADMIN') then
        raise exception 'TEAM_NOT_AUTHORIZED: only an owner or admin can change a member''s role.'
            using errcode = '42501';
    end if;

    select m.role into v_target_role
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = p_target_user_id;

    if v_target_role is null then
        raise exception 'TEAM_MEMBER_NOT_FOUND: that person is not a member of this organization.'
            using errcode = '23514';
    end if;

    -- An ADMIN may not act on an OWNER at all. Checked before the last-OWNER
    -- rule so an ADMIN gets the accurate reason rather than a misleading one
    -- when both would apply.
    if v_caller_role = 'ADMIN' and v_target_role = 'OWNER' then
        raise exception 'TEAM_ADMIN_CANNOT_MANAGE_OWNER: only an owner can change another owner''s role.'
            using errcode = '42501';
    end if;

    -- Only an OWNER may grant OWNER. An ADMIN promoting someone to OWNER would
    -- be a privilege escalation with an extra step — they could then have that
    -- person act on the real owners.
    if v_caller_role = 'ADMIN' and p_new_role = 'OWNER' then
        raise exception 'TEAM_ADMIN_CANNOT_GRANT_OWNER: only an owner can make someone else an owner.'
            using errcode = '42501';
    end if;

    -- No-op: nothing to do, and it must not be able to trip the rule below.
    if v_target_role = p_new_role then
        return;
    end if;

    -- An organization must always keep at least one OWNER, or nobody can ever
    -- grant OWNER again and the org is permanently un-administerable. This is
    -- about the org, not about who is asking, so it applies to an OWNER
    -- demoting themselves exactly as it does to anyone else.
    if v_target_role = 'OWNER' and p_new_role <> 'OWNER' then
        select count(*) into v_owner_count
        from public.organization_members
        where organization_id = p_org_id
          and role = 'OWNER';

        if v_owner_count <= 1 then
            raise exception 'TEAM_LAST_OWNER: this is the only owner. Make someone else an owner first.'
                using errcode = '23514';
        end if;
    end if;

    update public.organization_members
    set role = p_new_role
    where organization_id = p_org_id
      and user_id = p_target_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- remove_organization_member
-- ---------------------------------------------------------------------------
create or replace function public.remove_organization_member(
    p_org_id uuid,
    p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_caller_role text;
    v_target_role text;
    v_owner_count int;
    v_is_self boolean := (auth.uid() = p_target_user_id);
begin
    if auth.uid() is null then
        raise exception 'TEAM_NOT_AUTHORIZED: authentication required.'
            using errcode = '42501';
    end if;

    -- Same lock-then-count reasoning as change_member_role. Both functions take
    -- this lock on the same rows in the same order, so they cannot deadlock
    -- against each other.
    perform 1
    from public.organization_members
    where organization_id = p_org_id
    for update;

    v_caller_role := private.caller_role_in_org(p_org_id);

    -- Two ways to be authorised: manage the team, or be the person leaving.
    -- The second clause is what makes "leave this organization" reachable for a
    -- plain MEMBER, who by definition cannot manage anybody. It is still
    -- subject to the last-OWNER rule below — leaving is not an escape hatch
    -- from the invariant.
    if v_caller_role is null then
        raise exception 'TEAM_NOT_AUTHORIZED: you are not a member of this organization.'
            using errcode = '42501';
    end if;

    if v_caller_role not in ('OWNER', 'ADMIN') and not v_is_self then
        raise exception 'TEAM_NOT_AUTHORIZED: only an owner or admin can remove another member.'
            using errcode = '42501';
    end if;

    select m.role into v_target_role
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = p_target_user_id;

    if v_target_role is null then
        raise exception 'TEAM_MEMBER_NOT_FOUND: that person is not a member of this organization.'
            using errcode = '23514';
    end if;

    -- An ADMIN may not remove an OWNER. Not applied to self-removal, since an
    -- ADMIN removing themselves is not acting on an owner.
    if v_caller_role = 'ADMIN' and v_target_role = 'OWNER' and not v_is_self then
        raise exception 'TEAM_ADMIN_CANNOT_MANAGE_OWNER: only an owner can remove another owner.'
            using errcode = '42501';
    end if;

    if v_target_role = 'OWNER' then
        select count(*) into v_owner_count
        from public.organization_members
        where organization_id = p_org_id
          and role = 'OWNER';

        if v_owner_count <= 1 then
            raise exception 'TEAM_LAST_OWNER: this is the only owner. Make someone else an owner first.'
                using errcode = '23514';
        end if;
    end if;

    -- Release the leads this person owned, in the same transaction as the
    -- delete below — a plpgsql function body runs inside one transaction, so
    -- either both happen or neither does. There is no FK from leads.assigned_to
    -- to organization_members (it references auth.users, whose ON DELETE SET
    -- NULL only fires when the auth user itself is deleted), so nothing does
    -- this automatically. Without it a lead would keep pointing at somebody who
    -- is no longer in the org.
    --
    -- Touches assigned_to and nothing else. updated_at does move, because
    -- trigger_update_leads_timestamp fires on any UPDATE — that is the table's
    -- own behaviour, not a second column written here, and the row genuinely
    -- did change. Passes trigger_enforce_lead_assignee_membership on its
    -- assigned_to IS NULL early return, and trigger_enforce_lead_role_
    -- restrictions on its unchanged-columns fast path.
    update public.leads
    set assigned_to = null
    where organization_id = p_org_id
      and assigned_to = p_target_user_id;

    delete from public.organization_members
    where organization_id = p_org_id
      and user_id = p_target_user_id;
end;
$$;

-- ALTER DEFAULT PRIVILEGES already revokes EXECUTE from PUBLIC for new
-- functions in this database, but both are stated explicitly anyway: these are
-- privileged writes, and a grant that is only implicit is a grant nobody
-- reviews. anon is deliberately never granted — both functions require
-- auth.uid().
revoke execute on function public.change_member_role(uuid, uuid, text) from public;
grant execute on function public.change_member_role(uuid, uuid, text) to authenticated;

revoke execute on function public.remove_organization_member(uuid, uuid) from public;
grant execute on function public.remove_organization_member(uuid, uuid) to authenticated;
