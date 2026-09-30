-- Each Guest gets their own Demo Org (#29, ticket #31). Migration 1 of 2.
--
-- Design record: docs/adr/0001-each-guest-gets-their-own-demo-org.md.
-- Words (Guest, Demo Org, Sample Data): CONTEXT.md.
--
-- Two functions and one index. No table, column or policy changes:
--   - create_demo_org writes a whole Demo Org in one transaction.
--   - delete_expired_demo_orgs removes Demo Orgs older than a cutoff.
--   - organizations_demo_created_at_idx serves the cleanup's scan.
--
-- No new RLS policy is needed to wall Guests off from each other. Every tenant
-- policy already scopes by membership (private.current_org_ids()), and a Guest
-- is a member of exactly one org. src/lib/demo/demo-org.rls.test.ts proves it.
--
-- WHO IS A GUEST, IN ONE PLACE
-- A Guest is an auth user whose email matches 'demo-%@tekguyz-crm.test'.
-- src/lib/demo/guest.ts makes those addresses. Both functions below key off
-- this pattern, so neither can put a real person into a Demo Org, and the
-- cleanup can never delete an org that has a real person in it. `.test` is a
-- reserved TLD no real mailbox can hold.
--
-- Both functions are SECURITY DEFINER and executable by service_role only.
-- They bypass RLS on purpose: a Guest does not exist as a member until
-- create_demo_org makes them one, and the cleanup runs with no user at all
-- (a Vercel cron). Neither is callable by anon or authenticated.

-- 1. CREATE
--
-- p_sample is the Sample Data payload built by buildSampleData() in
-- src/lib/demo/sample-data.ts: arrays of leads, submissions, activity_logs,
-- tasks and prospects, with dates already resolved against "now" and lead ids
-- already generated, so the child rows can name their lead without a lookup.
-- organization_id is never read from the payload; every row gets v_org_id.
--
-- One plpgsql body is one transaction: the org, the OWNER membership and every
-- Sample Data row commit together or not at all.
create or replace function public.create_demo_org(
    p_user_id uuid,
    p_name text,
    p_sample jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_email text;
    v_org_id uuid;
begin
    select u.email into v_email from auth.users u where u.id = p_user_id;

    if v_email is null or v_email not like 'demo-%@tekguyz-crm.test' then
        raise exception 'DEMO_ORG_NOT_A_GUEST: only a Guest (demo-…@tekguyz-crm.test) can own a Demo Org.'
            using errcode = '42501';
    end if;

    -- A Guest owns exactly one Demo Org, and nothing else. A second org would
    -- be unreachable (getCurrentOrg resolves the oldest membership) and would
    -- break the "one Guest, one org" wall the RLS test relies on.
    if exists (select 1 from public.organization_members m where m.user_id = p_user_id) then
        raise exception 'DEMO_ORG_GUEST_HAS_ORG: this Guest already belongs to an organization.'
            using errcode = '23505';
    end if;

    -- "TEKGUYZ Demo" is the dev-login org, and the cleanup below skips it by
    -- name. A Demo Org with that name would never be cleaned up.
    if p_name is null or btrim(p_name) = '' or p_name = 'TEKGUYZ Demo' then
        raise exception 'DEMO_ORG_BAD_NAME: a Demo Org needs its own name.'
            using errcode = '22023';
    end if;

    insert into public.organizations (name, is_demo)
    values (p_name, true)
    returning id into v_org_id;

    insert into public.organization_members (organization_id, user_id, role)
    values (v_org_id, p_user_id, 'OWNER');

    insert into public.leads (
        id, organization_id, client_name, email, phone, company, website,
        physical_address, lead_source, service_category, estimated_revenue,
        status, outcome, actual_revenue, closed_at, next_action_at, created_at,
        is_starred, ai_brief
    )
    select
        r.id, v_org_id, r.client_name, r.email, r.phone, r.company, r.website,
        r.physical_address, r.lead_source, r.service_category, r.estimated_revenue,
        r.status, r.outcome, r.actual_revenue, r.closed_at, r.next_action_at, r.created_at,
        r.is_starred, r.ai_brief
    from pg_catalog.jsonb_to_recordset(p_sample -> 'leads') as r(
        id uuid, client_name text, email text, phone text, company text, website text,
        physical_address text, lead_source text, service_category text,
        estimated_revenue numeric, status text, outcome text, actual_revenue numeric,
        closed_at timestamptz, next_action_at timestamptz, created_at timestamptz,
        is_starred boolean, ai_brief text
    );

    -- Every lead path writes a submission row (.claude/rules/leads-and-ingestion.md).
    insert into public.lead_submissions (
        lead_id, organization_id, client_name, email, phone, company, message,
        service_category, lead_source, created_at
    )
    select
        r.lead_id, v_org_id, r.client_name, r.email, r.phone, r.company, r.message,
        r.service_category, r.lead_source, r.created_at
    from pg_catalog.jsonb_to_recordset(p_sample -> 'submissions') as r(
        lead_id uuid, client_name text, email text, phone text, company text,
        message text, service_category text, lead_source text, created_at timestamptz
    );

    insert into public.activity_logs (lead_id, organization_id, log_type, content, created_at)
    select r.lead_id, v_org_id, r.log_type, r.content, r.created_at
    from pg_catalog.jsonb_to_recordset(p_sample -> 'activity_logs') as r(
        lead_id uuid, log_type text, content text, created_at timestamptz
    );

    insert into public.tasks (
        organization_id, lead_id, title, description, due_at, completed, completed_at, created_by
    )
    select v_org_id, r.lead_id, r.title, r.description, r.due_at, r.completed, r.completed_at, p_user_id
    from pg_catalog.jsonb_to_recordset(p_sample -> 'tasks') as r(
        lead_id uuid, title text, description text, due_at timestamptz,
        completed boolean, completed_at timestamptz
    );

    insert into public.prospects (
        organization_id, place_id, name, category, address, city, state, postal_code,
        phone, website_url, website_status, rating, review_count, google_maps_url,
        niche_searched, city_searched, status, notes, archived
    )
    select
        v_org_id, r.place_id, r.name, r.category, r.address, r.city, r.state, r.postal_code,
        r.phone, r.website_url, r.website_status, r.rating, r.review_count, r.google_maps_url,
        r.niche_searched, r.city_searched, r.status, r.notes, r.archived
    from pg_catalog.jsonb_to_recordset(p_sample -> 'prospects') as r(
        place_id text, name text, category text, address text, city text, state text,
        postal_code text, phone text, website_url text, website_status text,
        rating numeric, review_count integer, google_maps_url text,
        niche_searched text, city_searched text, status text, notes text, archived boolean
    );

    return v_org_id;
end;
$$;

revoke all on function public.create_demo_org(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_demo_org(uuid, text, jsonb) to service_role;

-- 2. CLEANUP
--
-- Deletes up to p_limit Demo Orgs created before p_cutoff, oldest first. Every
-- tenant table cascades from organizations, so one DELETE removes the org and
-- every row it owns.
--
-- An org is deleted only when ALL of these hold:
--   - is_demo is true;
--   - its name is not "TEKGUYZ Demo" (kept for /api/dev-login);
--   - it has no member who is not a Guest. A zero-member Demo Org qualifies:
--     that is one whose Guest was already deleted.
--
-- Returns the Guests to delete, for the route to remove with the admin API
-- (auth users are deleted through GoTrue, not by SQL). Two kinds:
--   - the Guests of the orgs deleted in this call, captured BEFORE the delete,
--     because the cascade removes the membership rows that name them;
--   - older Guests with no membership at all, left behind by an earlier run
--     whose user delete failed, or by a create that failed after the user was
--     made. This is what makes a failed run heal itself on the next one.
create or replace function public.delete_expired_demo_orgs(
    p_cutoff timestamptz,
    p_limit integer default 100
)
returns table (guest_user_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_org_ids uuid[];
    v_guest_ids uuid[];
begin
    select coalesce(pg_catalog.array_agg(o.id), '{}') into v_org_ids
    from (
        select o.id
        from public.organizations o
        where o.is_demo
          and o.created_at < p_cutoff
          and o.name <> 'TEKGUYZ Demo'
          and not exists (
              select 1
              from public.organization_members m
              left join auth.users u on u.id = m.user_id
              where m.organization_id = o.id
                and (u.email is null or u.email not like 'demo-%@tekguyz-crm.test')
          )
        order by o.created_at
        limit p_limit
    ) o;

    select coalesce(pg_catalog.array_agg(m.user_id), '{}') into v_guest_ids
    from public.organization_members m
    where m.organization_id = any(v_org_ids);

    delete from public.organizations o where o.id = any(v_org_ids);

    return query
        select g.id from pg_catalog.unnest(v_guest_ids) as g(id)
        union
        select * from (
            select u.id
            from auth.users u
            where u.email like 'demo-%@tekguyz-crm.test'
              and u.created_at < p_cutoff
              and not exists (select 1 from public.organization_members m where m.user_id = u.id)
            limit p_limit
        ) orphans;
end;
$$;

revoke all on function public.delete_expired_demo_orgs(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.delete_expired_demo_orgs(timestamptz, integer) to service_role;

-- 3. INDEX
--
-- Partial: is_demo is false for every real org, so this index holds Demo Orgs
-- only and the cleanup never scans a real tenant.
create index if not exists organizations_demo_created_at_idx
    on public.organizations (created_at)
    where is_demo;
