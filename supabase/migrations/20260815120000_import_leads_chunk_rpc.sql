-- CSV import: move the chunk write into a SECURITY DEFINER RPC.
--
-- WHY RAW SQL IS REQUIRED (the root cause is the transport, not the index)
-- The only unique index on public.leads is unique_tenant_client_email_ci ON
-- public.leads (organization_id, lower(email)) — an EXPRESSION index.
-- insertLeadChunks previously wrote through PostgREST's upsert, whose
-- `on_conflict` parameter is a column-name list and therefore cannot name
-- `lower(email)`. Every chunk threw
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
-- so CSV import was structurally incapable of inserting a single row
-- ("0 imported / 1 batch(es) failed"). Raw SQL CAN infer an expression index,
-- so the write moves into a function. Same shape as the RPCs this schema
-- already uses for work PostgREST cannot express: vault_set_org_credential,
-- create_organization_with_owner, get_org_webhook_secret.
--
-- WHY THE INFERENCE FORM, NOT `ON CONFLICT ON CONSTRAINT`
-- unique_tenant_client_email_ci is a bare unique INDEX. pg_constraint on
-- public.leads holds only leads_pkey, one FK and two CHECKs — the constraint
-- name does not exist, and the `ON CONSTRAINT` form errors with
-- 'constraint "unique_tenant_client_email_ci" does not exist' (verified live on
-- a temp-table replica). It cannot be promoted either: Postgres unique
-- CONSTRAINTS cannot be built on expressions, so ALTER TABLE ... ADD CONSTRAINT
-- ... USING INDEX is unavailable. The predicate below therefore matches the
-- index definition character for character.
--
-- WHY DO NOTHING, NEVER DO UPDATE
-- DO UPDATE would let a CSV silently overwrite real leads — the overwrite
-- hazard already open on the webhook path (docs/KNOWN_GAPS.md). DO NOTHING
-- preserves the previous ignoreDuplicates semantics, which is exactly what the
-- wizard's "Already existed" tile counts. It also means an archived duplicate
-- stays archived: the Resurrection Engine remains exclusive to the webhook.
--
-- WHY RETURNING id, email
-- insertLeadChunks diffs the chunk's emails against the rows the write actually
-- returned — returned means inserted, absent means it already existed. That
-- diff is atomic with the write. A pre-SELECT would reintroduce the cross-chunk
-- TOCTOU race that docs/ADDENDA_LOG.md § Prompt 10 addendum designed it away
-- from.
--
-- WHY THE MEMBERSHIP CHECK IS THE WHOLE TENANT BOUNDARY HERE
-- SECURITY DEFINER bypasses RLS, so "Members create tenant leads" — currently
-- the only thing stopping a forged organization_id from writing into another
-- tenant — stops applying the moment this function runs. Re-asserting
-- membership in the body is therefore not defensive coding; it IS the boundary,
-- exactly as get_org_webhook_secret re-checks role rather than trusting its
-- p_org_id argument. auth.uid() still resolves under SECURITY DEFINER because
-- it reads the request JWT GUC, not the executing role.
--
-- Deliberately NOT changed by this migration: the three leads RLS policies
-- (byte-for-byte identical, they still govern every non-import path), the
-- enforce_lead_role_restrictions BEFORE UPDATE trigger (irrelevant to an INSERT
-- path), and unique_tenant_client_email_ci itself. No second plain unique index
-- on (organization_id, email) is added — that would reopen the case-sensitivity
-- bug class the _ci index exists to close.

create or replace function public.import_leads_chunk(
    p_organization_id uuid,
    p_rows jsonb
)
-- The OUT columns are deliberately NOT named id/email. `ON CONFLICT
-- (organization_id, lower(email))` is an inference expression, and Postgres
-- does not allow the target table to be qualified there — so an OUT column
-- named `email` makes that `email` ambiguous between a PL/pgSQL variable and a
-- table column, and the function fails at runtime with 42702. Verified on a
-- temp-table replica: the id/email naming raises, this naming works. Renaming
-- is preferred over `#variable_conflict use_column`, which would fix it
-- invisibly and leave the same trap set for the next editor.
returns table (lead_id uuid, lead_email text)
language plpgsql
security definer
-- Pinned per 20260721130000_pin_function_search_path.sql; every identifier
-- below is schema-qualified. Closes the search-path hijack the Supabase linter
-- flags on SECURITY DEFINER functions.
set search_path = ''
as $$
declare
    v_uid uuid := (select auth.uid());
begin
    -- No anonymous path exists here: the caller is always a signed-in user
    -- going through the batchInsertLeads Server Action with a session-bound
    -- client. Raise rather than fall through, unlike the trigger's deliberate
    -- service-role exemption — nothing service-role calls this.
    if v_uid is null then
        raise exception 'IMPORT_NOT_AUTHORIZED: authentication required.'
            using errcode = '42501';
    end if;

    -- Fail-closed. Any role is allowed to import (leads INSERT keeps full
    -- MEMBER parity by design, per CLAUDE.md § Multi-Tenant Security Model);
    -- the check is membership, not role.
    if not exists (
        select 1 from public.organization_members m
        where m.organization_id = p_organization_id
          and m.user_id = v_uid
    ) then
        raise exception 'IMPORT_NOT_AUTHORIZED: caller is not a member of the requested organization.'
            using errcode = '42501';
    end if;

    -- The data-modifying CTE keeps this a single statement, so RETURN QUERY
    -- gets a plain SELECT rather than a bare INSERT.
    return query
    with inserted as (
        insert into public.leads (
            organization_id,
            client_name,
            email,
            company,
            phone,
            website,
            physical_address,
            service_category,
            estimated_revenue,
            lead_source,
            status,
            next_action_at
        )
        select
            -- organization_id comes from the parameter the membership check
            -- above validated, NEVER from the row payload. buildInsertRows does
            -- put an organization_id on each row; omitting it from the column
            -- definition list below makes it structurally unreachable, so the
            -- membership check cannot be reduced to decoration by a forged row.
            p_organization_id,
            r.client_name,
            -- Backstop, not a behaviour change: the Zod layer already trims and
            -- lowercases. This guarantees the stored value can never disagree
            -- with the index expression, whatever a future caller sends.
            lower(trim(r.email)),
            r.company,
            r.phone,
            r.website,
            r.physical_address,
            r.service_category,
            r.estimated_revenue,
            r.lead_source,
            r.status,
            r.next_action_at
        from jsonb_to_recordset(p_rows) as r(
            client_name text,
            email text,
            company text,
            phone text,
            website text,
            physical_address text,
            service_category text,
            estimated_revenue numeric,
            lead_source text,
            status text,
            next_action_at timestamptz
        )
        on conflict (organization_id, lower(email)) do nothing
        returning leads.id, leads.email
    )
    select inserted.id, inserted.email from inserted;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on every new function, and
-- anon/authenticated inherit from PUBLIC — so without this revoke a SECURITY
-- DEFINER function in public is an unauthenticated API endpoint. Explicit here
-- rather than relying on the ALTER DEFAULT PRIVILEGES in the phase-1 migration,
-- which only covers the role that ran it.
revoke all on function public.import_leads_chunk(uuid, jsonb) from public, anon;
grant execute on function public.import_leads_chunk(uuid, jsonb) to authenticated;
