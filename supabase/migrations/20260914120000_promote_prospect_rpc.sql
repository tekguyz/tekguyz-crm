-- promote_prospect — the three promotion writes as ONE transaction.
--
-- Closes the KNOWN_GAPS bullet "Prospect promotion is not one cross-table
-- transaction, so a lost race can orphan a lead" (deferred 2026-08-26).
-- promoteProspect used to insert the leads row and its lead_submissions row,
-- and only THEN claim the prospect with a guarded single-statement UPDATE. The
-- claim was atomic; the three writes together were not. A concurrent promotion
-- that won the race in between left a real, unreferenced lead behind, and the
-- action could only log it and tell the operator.
--
-- A plpgsql function body runs inside one transaction, so all three writes now
-- commit together or not at all. There is no longer an orphan to report.
--
-- HOW THE RACE IS CLOSED, NOT JUST NARROWED
-- The prospect row is locked FOR UPDATE before anything is written. A second
-- concurrent call for the same prospect blocks on that lock until the first
-- commits, and under READ COMMITTED a FOR UPDATE re-reads the newest version of
-- the row it waited on — so the second call sees the first call's
-- promoted_lead_id and returns ALREADY_PROMOTED without inserting a lead.
--
-- The guarded claim is kept exactly as before anyway:
--
--   update public.prospects
--      set status = 'CONVERTED', promoted_lead_id = <new lead>
--    where id = <prospect> and promoted_lead_id is null
--
-- status and promoted_lead_id still move in ONE statement, and the `is null`
-- predicate still means a second promotion matches zero rows rather than
-- overwriting the first lead id. If it ever matches zero rows here, the
-- function RAISES, which rolls the lead and submission inserts back with it.
-- "Already promoted" is still defined solely by promoted_lead_id being
-- non-NULL; nothing below reads the status string.
--
-- WHY THE MEMBERSHIP CHECK IS THE WHOLE TENANT BOUNDARY HERE
-- SECURITY DEFINER bypasses RLS, so "Members create tenant leads", "Members
-- create tenant submissions" and "Members write tenant prospects" all stop
-- applying the moment this runs. The body re-resolves the CALLER's membership
-- for the p_org_id passed in, exactly as import_leads_chunk and
-- change_member_role do, and every write is scoped to that org id. A
-- client-supplied org id is an argument, never a claim. auth.uid() still
-- resolves under SECURITY DEFINER because it reads the request JWT GUC, not the
-- executing role.
--
-- Membership, not role: leads INSERT keeps full MEMBER parity by design, and
-- prospects has no role gate at all (prospect-promotion.rls.test.ts proves a
-- MEMBER could already promote). This function widens nothing.
--
-- RLS bypass is NOT trigger bypass. trigger_enforce_lead_assignee_membership
-- still fires on the INSERT (and passes, assigned_to is NULL), and both
-- updated_at triggers still fire. enforce_lead_role_restrictions is BEFORE
-- UPDATE on leads and is not reached.
--
-- THE lead_submissions ROW MATCHES src/lib/submissions/record.ts
-- Same ten columns toRow() writes, same NULL-for-absent stance, raw_payload
-- NULL because an in-app origin has no external body. client_name, email,
-- phone, company, service_category and lead_source are the same values the
-- leads row gets; message is the operator's call notes, which the leads row has
-- no column for.
--
-- EMAIL IS NOT RE-LOWERCASED, matching insertLeadWithSubmission: the caller
-- (buildPromotePayload) lowercases, and a caller that forgets should surface as
-- a real unique_tenant_client_email_ci violation, not be silently repaired in
-- one path and not the other. A collision raises 23505 out of the INSERT and
-- aborts the whole function, so it writes nothing — same as before.
--
-- Deliberately NOT changed: every RLS policy on leads, prospects and
-- lead_submissions; every table's DDL; unique_tenant_client_email_ci;
-- check_valid_prospect_status. No table, column, index, trigger or policy is
-- added.

create or replace function public.promote_prospect(
    p_org_id uuid,
    p_prospect_id uuid,
    p_client_name text,
    p_email text,
    p_phone text default null,
    p_company text default null,
    p_website text default null,
    p_physical_address text default null,
    p_service_category text default null,
    p_lead_source text default null,
    p_estimated_revenue numeric default 0,
    p_message text default null
)
-- OUT columns are not named after any table column (id, status, email, ...),
-- for the reason import_leads_chunk records: a plpgsql OUT column that shares a
-- name with a referenced column is ambiguous (42702) at runtime.
returns table (outcome text, promoted_lead uuid)
language plpgsql
security definer
-- Pinned per 20260721130000_pin_function_search_path.sql; every identifier
-- below is schema-qualified.
set search_path = ''
as $$
declare
    v_uid uuid := (select auth.uid());
    v_existing uuid;
    v_found boolean;
    v_lead_id uuid;
    v_claimed int;
begin
    -- No anonymous path: the only caller is the promoteProspect Server Action
    -- with a session-bound client.
    if v_uid is null then
        raise exception 'PROMOTE_NOT_AUTHORIZED: authentication required.'
            using errcode = '42501';
    end if;

    -- Fail-closed. A caller who is not a member of p_org_id stops here, so a
    -- valid session for some other tenant proves nothing.
    if not exists (
        select 1 from public.organization_members m
        where m.organization_id = p_org_id
          and m.user_id = v_uid
    ) then
        raise exception 'PROMOTE_NOT_AUTHORIZED: caller is not a member of the requested organization.'
            using errcode = '42501';
    end if;

    -- Lock first, then decide. Scoped by p_org_id, so another tenant's prospect
    -- id reads as not found — the same amount RLS used to reveal.
    select p.promoted_lead_id, true
      into v_existing, v_found
      from public.prospects p
     where p.id = p_prospect_id
       and p.organization_id = p_org_id
       for update;

    if v_found is null then
        raise exception 'PROMOTE_PROSPECT_NOT_FOUND: that prospect no longer exists.'
            using errcode = 'P0002';
    end if;

    -- Not an error: the double-click and the lost race both land here, and the
    -- caller wants the winning lead id to link to.
    if v_existing is not null then
        return query select 'ALREADY_PROMOTED'::text, v_existing;
        return;
    end if;

    insert into public.leads (
        organization_id,
        client_name,
        email,
        phone,
        company,
        website,
        physical_address,
        lead_source,
        service_category,
        estimated_revenue
    )
    values (
        p_org_id,
        p_client_name,
        p_email,
        p_phone,
        p_company,
        p_website,
        p_physical_address,
        p_lead_source,
        p_service_category,
        coalesce(p_estimated_revenue, 0)
    )
    returning id into v_lead_id;

    insert into public.lead_submissions (
        lead_id,
        organization_id,
        client_name,
        email,
        phone,
        company,
        message,
        service_category,
        lead_source,
        raw_payload
    )
    values (
        v_lead_id,
        p_org_id,
        p_client_name,
        p_email,
        p_phone,
        p_company,
        p_message,
        p_service_category,
        p_lead_source,
        null
    );

    -- THE guard, unchanged in shape: status and promoted_lead_id in one
    -- statement, `promoted_lead_id is null` in the same WHERE.
    update public.prospects
       set status = 'CONVERTED',
           promoted_lead_id = v_lead_id
     where id = p_prospect_id
       and organization_id = p_org_id
       and promoted_lead_id is null;

    get diagnostics v_claimed = row_count;

    -- Unreachable while the FOR UPDATE above holds. Kept as a raise rather than
    -- a comment: if it ever fires, the raise rolls back the two inserts above,
    -- so the failure mode is "nothing happened", never an orphaned lead.
    if v_claimed <> 1 then
        raise exception 'PROMOTE_CLAIM_FAILED: prospect % was claimed concurrently.', p_prospect_id
            using errcode = '40001';
    end if;

    return query select 'PROMOTED'::text, v_lead_id;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC on every new function, and anon inherits
-- from PUBLIC. demo_readonly is deliberately never granted, so the public demo
-- is refused with "permission denied for function" below RLS, like every other
-- write RPC (20260904120000_demo_readonly_role.sql).
revoke all on function public.promote_prospect(
    uuid, uuid, text, text, text, text, text, text, text, text, numeric, text
) from public, anon;
grant execute on function public.promote_prospect(
    uuid, uuid, text, text, text, text, text, text, text, text, numeric, text
) to authenticated;
