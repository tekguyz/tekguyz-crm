-- prospects — the cold-outreach staging table for Google Business Profile scrapes.
--
-- WHY A SEPARATE TABLE AND NOT leads
-- The sibling tekguyz-leadgen repo scrapes Google Business Profiles. GBP does
-- not expose an email address and never will, so every row it produces has no
-- email. public.leads.email is NOT NULL and is half of
-- unique_tenant_client_email_ci (organization_id, lower(email)) — the one
-- unique index the whole lead pipeline, the webhook Resurrection Engine and
-- import_leads_chunk's ON CONFLICT inference all key on. Putting emailless
-- rows into leads would require either weakening that index or synthesizing
-- fake emails, and both reopen the identity-collision bug class that
-- 20260817120000_lead_submissions.sql was written to close.
--
-- prospects therefore sits BESIDE leads, not inside it. It is keyed on
-- place_id, which is leadgen's own global append-only key (Google's stable
-- Place ID), so re-running the same scrape is naturally idempotent. A prospect
-- is promoted into leads later, by hand, once a phone call produces a real
-- email address. That promotion path is deliberately NOT in this migration.
--
-- WHAT THIS MIGRATION DELIBERATELY DOES NOT TOUCH
-- public.leads DDL, its three RLS policies, unique_tenant_client_email_ci,
-- enforce_lead_role_restrictions, enforce_lead_assignee_membership,
-- import_leads_chunk, organization_members, and anything vault-related. All
-- byte-for-byte unchanged. The only thing here that even reads leads is the
-- duplicate-phone lookup inside import_prospects_chunk, which is a SELECT.
--
-- WHY NO INDEX IS ADDED TO leads FOR THAT LOOKUP
-- The lookup compares a normalized-digits expression against leads.phone, which
-- would ideally be backed by a functional index on leads. Adding one is DDL on
-- leads and is out of scope for this unit by explicit instruction. At the
-- current scale (low hundreds of leads per tenant, one lookup per imported CSV
-- row, import is a manual operator action) a sequential scan per row is
-- irrelevant. Registered in docs/KNOWN_GAPS.md rather than silently accepted.
--
-- RLS SHAPE: mirrors leads/tasks/lead_submissions byte-for-byte — plain
-- `organization_id in (select private.current_org_ids())`, with paired
-- USING/WITH CHECK on UPDATE and WITH CHECK on INSERT. No role-based EXISTS
-- check: a prospect is strictly less privileged than a lead, and leads INSERT
-- itself keeps full MEMBER parity by design (CLAUDE.md § Multi-Tenant Security
-- Model). No DELETE policy and no DELETE grant — the app-wide no-hard-deletes
-- rule, same stance as activity_logs and lead_submissions; `archived` is the
-- user-facing removal lever.

create table public.prospects (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,

    -- Google's Place ID. leadgen's own global, append-only key: the same
    -- business scraped from a different niche query or a later run comes back
    -- with the same place_id, which is what makes re-import a no-op rather
    -- than a duplicate. NOT NULL and unique per tenant — see
    -- unique_tenant_place_id below.
    place_id text not null,

    -- The scrape payload, one column per CSV header, in the exact order
    -- tekguyz-leadgen writes them:
    --   place_id,name,category,address,city,state,postal_code,phone,
    --   website_url,website_status,rating,review_count,google_maps_url,
    --   niche_searched,city_searched,run_id,scraped_at
    -- Everything except name is nullable because the scraper genuinely emits
    -- blanks: 5 of the 122 rows in the current two files have no phone, and a
    -- mobile-only business has no address/city/state/postal_code at all.
    name text not null,
    category text default null,
    address text default null,
    city text default null,
    state text default null,
    postal_code text default null,
    phone text default null,
    website_url text default null,
    -- Free text, deliberately NOT a CHECK constraint. Today every scraped row
    -- reads NO_WEBSITE (that is the filter the scrape applies — businesses
    -- without a site are the sales target), but the vocabulary belongs to the
    -- leadgen repo and a CHECK here would make its next release fail an import
    -- rather than store an unfamiliar value.
    website_status text default null,
    rating numeric(2, 1) default null,
    review_count integer default null,
    google_maps_url text default null,
    -- What the scraper searched for, kept so a prospect can be traced back to
    -- the run that produced it.
    niche_searched text default null,
    city_searched text default null,
    run_id text default null,
    scraped_at timestamptz default null,

    -- Normalized phone for duplicate detection. STORED GENERATED, so it can
    -- never disagree with `phone` and no caller has to remember to set it —
    -- including a future hand-written INSERT that skips the RPC.
    --
    -- NULL means "not comparable", not "no digits": a fragment shorter than 10
    -- digits is dropped rather than kept, because a 7-digit local number would
    -- otherwise false-match every number ending in those 7 digits. Ten digits
    -- is the NANP subscriber number; taking the RIGHT ten also strips a
    -- leading 1 or +1 country code, so 1-954-555-1234, (954) 555-1234 and
    -- 9545551234 all normalize to 9545551234.
    --
    -- !! This expression is duplicated once, on the leads side of the duplicate
    -- lookup in import_prospects_chunk below, because leads cannot get a column
    -- in this unit. The two must stay character-for-character identical.
    -- src/lib/prospects/phone.ts holds the TypeScript twin, and the prospects
    -- RLS suite asserts a formatted/unformatted pair actually matches, so drift
    -- fails a test rather than silently missing duplicates.
    phone_digits text generated always as (
        case
            when pg_catalog.length(pg_catalog.regexp_replace(phone, '[^0-9]', '', 'g')) >= 10
            then pg_catalog."right"(pg_catalog.regexp_replace(phone, '[^0-9]', '', 'g'), 10)
            else null
        end
    ) stored,

    -- Cold-call working state. Kept deliberately small: these five are the
    -- states a dialling session actually produces. Promotion into leads is
    -- Prompt 2 and does NOT appear here — a prospect that converts gets its
    -- lead row then, not a column now.
    status text not null default 'NEW',

    -- Reference only, written once at import time, never enforced. It records
    -- "this scraped business shares a phone number with an existing lead" so an
    -- operator does not cold-call an existing client. It is NOT a constraint
    -- and NOT a dedup key: a shared number can also be a shared answering
    -- service or a stale lead, so the judgement stays with a human.
    -- ON DELETE SET NULL rather than CASCADE — losing the hint must never
    -- delete the prospect.
    possible_duplicate_lead_id uuid default null references public.leads(id) on delete set null,

    archived boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- The dedup key. Scoped by tenant, not global: two organizations may each
    -- legitimately hold the same business as a prospect. This is what makes
    -- import_prospects_chunk's ON CONFLICT DO NOTHING idempotent, and unlike
    -- leads' unique_tenant_client_email_ci it is a plain column pair, so
    -- PostgREST's onConflict could address it — the RPC exists here for the
    -- tenant-boundary and duplicate-lookup reasons, not the index-shape one.
    constraint unique_tenant_place_id unique (organization_id, place_id),
    constraint check_valid_prospect_status check (
        status in ('NEW', 'CALLED', 'CALLBACK', 'NOT_INTERESTED', 'CONVERTED')
    )
);

-- Reuses the existing helper from 20260706224417_leads_table.sql as-is; no new
-- function is introduced for this.
create trigger trigger_update_prospects_timestamp
    before update on public.prospects
    for each row
    execute function public.sync_modified_timestamp();

alter table public.prospects enable row level security;

-- No delete grant at all — see the header. update IS granted: an operator marks
-- a prospect CALLED / NOT_INTERESTED from the UI.
grant select, insert, update on public.prospects to authenticated;

create policy "Members read tenant prospects" on public.prospects
    for select using (organization_id in (select private.current_org_ids()));

create policy "Members create tenant prospects" on public.prospects
    for insert with check (organization_id in (select private.current_org_ids()));

create policy "Members write tenant prospects" on public.prospects
    for update
    using (organization_id in (select private.current_org_ids()))
    with check (organization_id in (select private.current_org_ids()));

-- The list read the calling queue actually issues: one tenant's live prospects
-- by working state.
create index idx_prospects_tenant_status on public.prospects(organization_id, status)
    where archived = false;

-- Backs the duplicate-phone lookup on the prospects side, and any future
-- "is this number already a prospect" check.
create index idx_prospects_phone_digits on public.prospects(organization_id, phone_digits)
    where phone_digits is not null;

-- Unindexed foreign keys make the referenced table's deletes scan this one.
-- leads rows are not deleted today, but the FK is here and so is the index.
create index idx_prospects_possible_duplicate on public.prospects(possible_duplicate_lead_id)
    where possible_duplicate_lead_id is not null;


-- ---------------------------------------------------------------------------
-- import_prospects_chunk — the chunked CSV write, modelled on
-- 20260815120000_import_leads_chunk_rpc.sql.
--
-- WHY AN RPC RATHER THAN PostgREST upsert
-- Not the reason import_leads_chunk needed one. unique_tenant_place_id is a
-- plain column pair, so PostgREST's onConflict COULD address it. Two other
-- things force the function:
--   1. The duplicate-phone lookup joins against public.leads inside the same
--      statement as the insert. PostgREST cannot express a join-on-insert, and
--      doing it as a second round trip would be a TOCTOU race against
--      concurrent lead writes — exactly the race insertLeadChunks' returned-row
--      diff was designed away from.
--   2. p_organization_id must be the ONLY source of the tenant id. Below, the
--      column definition list for jsonb_to_recordset deliberately omits
--      organization_id, so a forged row literally cannot reach the insert.
--
-- WHY THE MEMBERSHIP CHECK IS THE WHOLE TENANT BOUNDARY HERE
-- SECURITY DEFINER bypasses RLS, so "Members create tenant prospects" stops
-- applying the moment this runs. Re-asserting membership in the body is not
-- defensive coding; it IS the boundary — same as import_leads_chunk and
-- get_org_webhook_secret. auth.uid() still resolves under SECURITY DEFINER
-- because it reads the request JWT GUC, not the executing role.
--
-- WHY DO NOTHING, NEVER DO UPDATE
-- Re-importing a scrape must never overwrite an operator's working state. A
-- prospect already in the table may have been called, marked CALLBACK, or
-- archived; DO UPDATE would silently reset that from a stale CSV. This is the
-- same first-known-value rule CLAUDE.md states for leads identity columns, and
-- it is what makes "run the same import twice, insert zero rows" true.
--
-- WHY THE OUT COLUMNS ARE NOT NAMED id/place_id
-- Same trap import_leads_chunk documents: an OUT column sharing a name with a
-- column referenced in ON CONFLICT makes that reference ambiguous between a
-- PL/pgSQL variable and a table column, and the function fails at runtime with
-- 42702. Renaming is preferred over `#variable_conflict use_column`, which
-- would fix it invisibly and leave the trap set for the next editor.
-- ---------------------------------------------------------------------------

create or replace function public.import_prospects_chunk(
    p_organization_id uuid,
    p_rows jsonb
)
returns table (prospect_id uuid, prospect_place_id text, duplicate_lead_id uuid)
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
    -- going through the importProspects Server Action with a session-bound
    -- client. Raise rather than fall through — nothing service-role calls this.
    if v_uid is null then
        raise exception 'PROSPECT_IMPORT_NOT_AUTHORIZED: authentication required.'
            using errcode = '42501';
    end if;

    -- Fail-closed. The check is membership, not role: prospects INSERT keeps
    -- full MEMBER parity, matching leads.
    if not exists (
        select 1 from public.organization_members m
        where m.organization_id = p_organization_id
          and m.user_id = v_uid
    ) then
        raise exception 'PROSPECT_IMPORT_NOT_AUTHORIZED: caller is not a member of the requested organization.'
            using errcode = '42501';
    end if;

    return query
    with inserted as (
        insert into public.prospects (
            organization_id,
            place_id,
            name,
            category,
            address,
            city,
            state,
            postal_code,
            phone,
            website_url,
            website_status,
            rating,
            review_count,
            google_maps_url,
            niche_searched,
            city_searched,
            run_id,
            scraped_at,
            possible_duplicate_lead_id
        )
        select
            -- From the validated parameter, NEVER from the row payload — the
            -- recordset definition below has no organization_id column at all,
            -- which makes a forged one structurally unreachable rather than
            -- merely ignored.
            p_organization_id,
            r.place_id,
            r.name,
            r.category,
            r.address,
            r.city,
            r.state,
            r.postal_code,
            r.phone,
            r.website_url,
            r.website_status,
            r.rating,
            r.review_count,
            r.google_maps_url,
            r.niche_searched,
            r.city_searched,
            r.run_id,
            r.scraped_at,
            dup.lead_id
        from pg_catalog.jsonb_to_recordset(p_rows) as r(
            place_id text,
            name text,
            category text,
            address text,
            city text,
            state text,
            postal_code text,
            phone text,
            website_url text,
            website_status text,
            rating numeric,
            review_count integer,
            google_maps_url text,
            niche_searched text,
            city_searched text,
            run_id text,
            scraped_at timestamptz
        )
        -- Reference-only duplicate hint. LEFT JOIN LATERAL, so a row with no
        -- match still imports with a NULL hint — this must never filter.
        --
        -- The leads-side normalization below is the character-for-character
        -- twin of prospects.phone_digits' generated expression above. It is
        -- written out rather than shared because leads cannot get a column in
        -- this unit; the RLS suite asserts the two agree.
        --
        -- Scoped to p_organization_id, which the membership check validated —
        -- so this cannot be used to probe another tenant's phone numbers, and
        -- the returned uuid always belongs to an org the caller is in.
        -- Ordered by created_at so the same CSV always produces the same hint
        -- when several leads share a number; LIMIT 1 because this is a pointer
        -- for a human, not a set.
        left join lateral (
            select l.id as lead_id
            from public.leads l
            where l.organization_id = p_organization_id
              and case
                    when pg_catalog.length(pg_catalog.regexp_replace(l.phone, '[^0-9]', '', 'g')) >= 10
                    then pg_catalog."right"(pg_catalog.regexp_replace(l.phone, '[^0-9]', '', 'g'), 10)
                    else null
                  end
                  = case
                      when pg_catalog.length(pg_catalog.regexp_replace(r.phone, '[^0-9]', '', 'g')) >= 10
                      then pg_catalog."right"(pg_catalog.regexp_replace(r.phone, '[^0-9]', '', 'g'), 10)
                      else null
                    end
            order by l.created_at
            limit 1
        ) dup on true
        on conflict (organization_id, place_id) do nothing
        returning prospects.id, prospects.place_id, prospects.possible_duplicate_lead_id
    )
    select inserted.id, inserted.place_id, inserted.possible_duplicate_lead_id from inserted;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on every new function, and
-- anon/authenticated inherit from PUBLIC — so without this revoke a SECURITY
-- DEFINER function in public is an unauthenticated API endpoint.
revoke all on function public.import_prospects_chunk(uuid, jsonb) from public, anon;
grant execute on function public.import_prospects_chunk(uuid, jsonb) to authenticated;
