-- Muse Lead Packs (#37): email is optional, WhatsApp is a channel, and the
-- import matches duplicates on any channel.
--
-- WHY
-- Leads now arrive as a weekly Lead Pack from Muse (Meta AI): a CSV the founder
-- imports by hand. Most of its leads have no email. leads.email was NOT NULL,
-- so the CRM refused them. Email is now required only on the website's
-- contact form (the webhook, which keeps its own check). Everywhere else a
-- lead needs a name and at least one Contact Channel: email, phone, website,
-- Facebook, Instagram, WhatsApp or Google Business Profile (CONTEXT.md
-- § Leads).
--
-- WHAT THIS MIGRATION DOES
--   1. leads.social_whatsapp, a new nullable column. It joins LEAD_COLUMNS in
--      the app, so this migration lands before that code (CLAUDE.md hard rule).
--   2. leads.email and lead_submissions.email become nullable.
--      unique_tenant_client_email_ci stays: a unique index lets many NULLs in.
--   3. Three CHECKs on leads: a non-blank name, no blank-string email (a
--      missing email is NULL, never '', or two email-less leads would collide
--      on the unique index), and at least one non-blank Contact Channel.
--   4. One IMMUTABLE key function per channel. They are the ONE place the
--      cleaning rules live: the import RPC and the indexes both call them.
--   5. A plain (non-unique) index on (organization_id, key(column)) for each
--      channel. Not unique on purpose: a lead edited by hand may share a link
--      with another lead. Only the import skips a match.
--   6. A new import_leads_chunk. It walks the rows one by one, so a row also
--      matches a lead an earlier row of the same file just inserted. It
--      returns one outcome per row index, and it writes each new lead's first
--      lead_submissions row itself, in the same transaction.
--
-- EXISTING ROWS
-- Checked live on 2026-09-30 before writing this: 23 leads, none with a blank
-- name, a blank email or no channel. The demo Sample Data always has a name,
-- an email and a phone. So the CHECKs validate without a rewrite.
--
-- DEPLOY WINDOW
-- The old app code calls import_leads_chunk and expects (lead_id, lead_email)
-- back. Between applying this migration and deploying the new import code,
-- CSV import on the live site fails. Nothing else changes for the old code:
-- it always sends an email and a name.

-- 1 + 2. Columns ---------------------------------------------------------------

alter table public.leads
    add column social_whatsapp text default null;

alter table public.leads
    alter column email drop not null;

alter table public.lead_submissions
    alter column email drop not null;

-- 3. The contact rule ---------------------------------------------------------
-- Three separate CHECKs, so the error names the rule that failed. The app
-- (Zod, createLead, updateLead) mirrors them to give the user a clear reason;
-- these are the backstop that holds whatever a future caller sends.

alter table public.leads
    add constraint check_lead_name_not_blank
        check (btrim(client_name) <> ''),
    add constraint check_lead_email_not_blank
        check (email is null or btrim(email) <> ''),
    add constraint check_lead_has_contact_channel
        check (coalesce(
            nullif(btrim(email), ''),
            nullif(btrim(phone), ''),
            nullif(btrim(website), ''),
            nullif(btrim(social_facebook), ''),
            nullif(btrim(social_instagram), ''),
            nullif(btrim(social_whatsapp), ''),
            nullif(btrim(social_google_business), '')
        ) is not null);

-- 4. Key functions ------------------------------------------------------------
-- Each one turns a stored value into the form two leads are compared in, or
-- NULL when the value names nothing a duplicate can be judged on. NULL never
-- matches anything, which is how "a name alone never makes a duplicate" holds.
--
-- IMMUTABLE and STRICT: they read nothing but their argument, so they can back
-- an index. search_path is pinned per 20260721130000_pin_function_search_path.sql;
-- they only call pg_catalog built-ins.
--
-- They live in public, callable by authenticated and service_role, for two
-- reasons. Postgres checks EXECUTE on an index expression's function for the
-- role that writes the row, so createLead, updateLead and the webhook need it.
-- And the integration suite calls them directly. They are pure string
-- functions and read no table, so exposing them leaks nothing.

-- Email: trim, lower case.
create or replace function public.lead_key_email(p text)
returns text
language sql
immutable strict parallel safe
set search_path = ''
as $$
    select nullif(lower(btrim(p)), '');
$$;

-- Phone and WhatsApp share this key: a number is a number. Digits only; an
-- 11-digit number that starts with 1 drops the 1, so (305) 555-1234 and
-- +1 305 555 1234 match. The query string is cut first, because a wa.me link
-- can carry ?text=Hi%20there and %20 holds digits. An api.whatsapp.com link
-- keeps its number in ?phone=, so that one is read from the query.
create or replace function public.lead_key_phone(p text)
returns text
language plpgsql
immutable strict parallel safe
set search_path = ''
as $$
declare
    v_digits text;
begin
    v_digits := (regexp_match(p, '[?&]phone=([^&#]*)', 'i'))[1];
    if v_digits is null then
        v_digits := split_part(split_part(p, '?', 1), '#', 1);
    end if;
    v_digits := regexp_replace(v_digits, '[^0-9]', '', 'g');
    if length(v_digits) = 11 and left(v_digits, 1) = '1' then
        v_digits := substr(v_digits, 2);
    end if;
    return nullif(v_digits, '');
end;
$$;

-- Website: no scheme, no www., lower-case host, keep the path as written,
-- drop the query and the fragment, no trailing slash. A value whose host has
-- no dot (N/A, "none", a business name) is not a website and gives NULL.
create or replace function public.lead_key_website(p text)
returns text
language plpgsql
immutable strict parallel safe
set search_path = ''
as $$
declare
    v text;
    v_host text;
    v_path text;
begin
    v := regexp_replace(btrim(p), '^[a-z][a-z0-9+.-]*://', '', 'i');
    v := regexp_replace(v, '[?#].*$', '');
    v_host := split_part(v, '/', 1);
    v_path := regexp_replace(substr(v, length(v_host) + 1), '/+$', '');
    v_host := regexp_replace(lower(v_host), '^www\.', '');
    if v_host !~ '^[^./\s:@]+(\.[^./\s:@]+)+(:[0-9]+)?$' then
        return null;
    end if;
    return v_host || v_path;
end;
$$;

-- Facebook: m., web., mbasic., www. and fb.com all become facebook.com. A
-- profile.php link keeps only its id=; any other link drops its query. No
-- trailing slash, lower case. A link to another site, or to facebook.com with
-- no page, gives NULL.
create or replace function public.lead_key_facebook(p text)
returns text
language plpgsql
immutable strict parallel safe
set search_path = ''
as $$
declare
    v text;
    v_base text;
    v_query text;
    v_host text;
    v_path text;
    v_id text;
begin
    v := regexp_replace(lower(btrim(p)), '^[a-z][a-z0-9+.-]*://', '');
    v := split_part(v, '#', 1);
    v_base := split_part(v, '?', 1);
    v_query := substr(v, length(v_base) + 2);
    v_host := split_part(v_base, '/', 1);
    v_path := regexp_replace(substr(v_base, length(v_host) + 1), '/+$', '');
    v_host := regexp_replace(v_host, '^(www|m|web|mbasic)\.', '');
    if v_host = 'fb.com' then
        v_host := 'facebook.com';
    end if;
    if v_host <> 'facebook.com' or v_path = '' then
        return null;
    end if;
    if v_path = '/profile.php' then
        v_id := (regexp_match('&' || v_query, '&id=([0-9]+)'))[1];
        if v_id is null then
            return null;
        end if;
        return 'facebook.com/profile.php?id=' || v_id;
    end if;
    return v_host || v_path;
end;
$$;

-- Instagram: instagram.com/<handle>, lower case, query dropped. Post, reel and
-- explore links name a post, not an account, so they give NULL; a story link
-- names its account in the next segment.
create or replace function public.lead_key_instagram(p text)
returns text
language plpgsql
immutable strict parallel safe
set search_path = ''
as $$
declare
    v text;
    v_host text;
    v_handle text;
begin
    v := regexp_replace(lower(btrim(p)), '^[a-z][a-z0-9+.-]*://', '');
    v := split_part(split_part(v, '#', 1), '?', 1);
    v_host := regexp_replace(split_part(v, '/', 1), '^(www|m)\.', '');
    if v_host <> 'instagram.com' then
        return null;
    end if;
    v_handle := split_part(v, '/', 2);
    if v_handle = 'stories' then
        v_handle := split_part(v, '/', 3);
    end if;
    if v_handle in ('', 'p', 'reel', 'reels', 'tv', 'explore', 'accounts') then
        return null;
    end if;
    return 'instagram.com/' || v_handle;
end;
$$;

-- Google Business Profile: only a link that names ONE place counts. In order:
--   place_id (as ?place_id=, ?query_place_id= or q=place_id:) -> 'place_id:<id>'
--   ?cid=<digits>                                              -> 'cid:<digits>'
--   /maps/place/... with a feature id in its data= part        -> 'ftid:<id>'
--   /maps/place/<name>/@<lat>,<lng>                            -> 'place:<name>@<lat>,<lng>'
-- A search link (?query=...) and a /maps/place/<name> link with no id and no
-- coordinates are just a name, so they give NULL. IDs keep their case: a
-- place_id is case-sensitive.
create or replace function public.lead_key_google(p text)
returns text
language plpgsql
immutable strict parallel safe
set search_path = ''
as $$
declare
    v text := btrim(p);
    v_host text;
    v_match text[];
begin
    v_host := lower(split_part(regexp_replace(v, '^[a-z][a-z0-9+.-]*://', '', 'i'), '/', 1));
    v_host := split_part(v_host, '?', 1);
    if v_host !~ '(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$' then
        return null;
    end if;

    v_match := regexp_match(v, 'place_id(?:=|:|%3a)([A-Za-z0-9_-]+)', 'i');
    if v_match is not null then
        return 'place_id:' || v_match[1];
    end if;

    v_match := regexp_match(v, '[?&]cid=([0-9]+)', 'i');
    if v_match is not null then
        return 'cid:' || v_match[1];
    end if;

    if v !~* '/maps/place/' then
        return null;
    end if;

    v_match := regexp_match(v, '!1s(0x[0-9a-f]+:0x[0-9a-f]+)', 'i');
    if v_match is not null then
        return 'ftid:' || lower(v_match[1]);
    end if;

    v_match := regexp_match(v, '/maps/place/([^/?#@]+)/@(-?[0-9.]+,-?[0-9.]+)', 'i');
    if v_match is not null then
        return 'place:' || lower(v_match[1]) || '@' || v_match[2];
    end if;

    return null;
end;
$$;

revoke all on function
    public.lead_key_email(text),
    public.lead_key_phone(text),
    public.lead_key_website(text),
    public.lead_key_facebook(text),
    public.lead_key_instagram(text),
    public.lead_key_google(text)
from public, anon;

grant execute on function
    public.lead_key_email(text),
    public.lead_key_phone(text),
    public.lead_key_website(text),
    public.lead_key_facebook(text),
    public.lead_key_instagram(text),
    public.lead_key_google(text)
to authenticated, service_role;

-- 5. Indexes ------------------------------------------------------------------
-- One per channel, each shaped exactly like the matching clause in
-- import_leads_chunk, so the per-row lookup is an index scan per channel
-- combined with a BitmapOr. WhatsApp gets its own index on the phone key,
-- because a row's phone or WhatsApp number is looked up in both columns.

create index idx_leads_key_email
    on public.leads (organization_id, public.lead_key_email(email));
create index idx_leads_key_phone
    on public.leads (organization_id, public.lead_key_phone(phone));
create index idx_leads_key_whatsapp
    on public.leads (organization_id, public.lead_key_phone(social_whatsapp));
create index idx_leads_key_website
    on public.leads (organization_id, public.lead_key_website(website));
create index idx_leads_key_facebook
    on public.leads (organization_id, public.lead_key_facebook(social_facebook));
create index idx_leads_key_instagram
    on public.leads (organization_id, public.lead_key_instagram(social_instagram));
create index idx_leads_key_google
    on public.leads (organization_id, public.lead_key_google(social_google_business));

-- 6. import_leads_chunk -------------------------------------------------------
-- Dropped, not replaced: the return type changes, and CREATE OR REPLACE cannot
-- change a return type. The grants go with it and are re-made below.

drop function public.import_leads_chunk(uuid, jsonb);

create function public.import_leads_chunk(
    p_organization_id uuid,
    p_rows jsonb
)
-- One row out per row in, keyed by row_index: the row's 0-based position in
-- p_rows. outcome is INSERTED (lead_id is the new lead), DUPLICATE (lead_id is
-- the existing lead, lead_archived says whether it is archived) or REJECTED
-- (reason says why; nothing was written).
--
-- None of these names is `email` or `organization_id`: the ON CONFLICT below
-- is an inference expression, which cannot be table-qualified, so an OUT
-- column with either name would make it ambiguous (42702). See
-- 20260815120000_import_leads_chunk_rpc.sql.
returns table (
    row_index integer,
    outcome text,
    lead_id uuid,
    lead_archived boolean,
    reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := (select auth.uid());
    r record;
    v_name text;
    v_email text;
    v_phone text;
    v_website text;
    v_facebook text;
    v_instagram text;
    v_whatsapp text;
    v_google text;
    v_company text;
    v_service_category text;
    v_lead_source text;
    k_email text;
    k_numbers text[];
    k_website text;
    k_facebook text;
    k_instagram text;
    k_google text;
    v_match_id uuid;
    v_match_archived boolean;
    v_new_id uuid;
begin
    -- The tenant boundary. SECURITY DEFINER bypasses RLS, so the membership
    -- check here is the whole wall, exactly as in the function this replaces.
    if v_uid is null then
        raise exception 'IMPORT_NOT_AUTHORIZED: authentication required.'
            using errcode = '42501';
    end if;

    if not exists (
        select 1 from public.organization_members m
        where m.organization_id = p_organization_id
          and m.user_id = v_uid
    ) then
        raise exception 'IMPORT_NOT_AUTHORIZED: caller is not a member of the requested organization.'
            using errcode = '42501';
    end if;

    if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
        raise exception 'IMPORT_BAD_ROWS: p_rows must be a JSON array.'
            using errcode = '22023';
    end if;

    -- One row at a time, in file order. Each iteration sees the leads the
    -- earlier ones inserted, so a duplicate inside the file is caught by the
    -- same lookup as a duplicate of an older lead: first row wins.
    for r in
        select (e.ord - 1)::integer as idx, x.*
        from jsonb_array_elements(p_rows) with ordinality as e(value, ord)
        cross join lateral jsonb_to_record(e.value) as x(
            client_name text,
            email text,
            phone text,
            company text,
            website text,
            physical_address text,
            social_google_business text,
            social_facebook text,
            social_instagram text,
            social_whatsapp text,
            lead_source text,
            service_category text,
            ai_brief text,
            estimated_revenue numeric,
            status text,
            next_action_at timestamptz
        )
        order by e.ord
    loop
        row_index := r.idx;
        outcome := null;
        lead_id := null;
        lead_archived := null;
        reason := null;

        -- Blank is stored as NULL, never ''. The email is stored in its key
        -- form, so the stored value always agrees with the unique index.
        v_name := nullif(btrim(r.client_name), '');
        v_email := public.lead_key_email(r.email);
        v_phone := nullif(btrim(r.phone), '');
        v_website := nullif(btrim(r.website), '');
        v_facebook := nullif(btrim(r.social_facebook), '');
        v_instagram := nullif(btrim(r.social_instagram), '');
        v_whatsapp := nullif(btrim(r.social_whatsapp), '');
        v_google := nullif(btrim(r.social_google_business), '');
        v_company := nullif(btrim(r.company), '');
        v_service_category := nullif(btrim(r.service_category), '');
        v_lead_source := nullif(btrim(r.lead_source), '');

        -- The contact rule, checked here so one bad row is reported and
        -- skipped instead of aborting the chunk on the CHECK.
        if v_name is null then
            outcome := 'REJECTED';
            reason := 'NO_NAME';
            return next;
            continue;
        end if;

        if coalesce(v_email, v_phone, v_website, v_facebook, v_instagram, v_whatsapp, v_google) is null then
            outcome := 'REJECTED';
            reason := 'NO_CONTACT_CHANNEL';
            return next;
            continue;
        end if;

        k_email := v_email;
        k_numbers := array[public.lead_key_phone(v_phone), public.lead_key_phone(v_whatsapp)];
        k_website := public.lead_key_website(v_website);
        k_facebook := public.lead_key_facebook(v_facebook);
        k_instagram := public.lead_key_instagram(v_instagram);
        k_google := public.lead_key_google(v_google);

        -- Any one channel matching makes it the same business. NULL keys
        -- never match. An active match is preferred over an archived one.
        v_match_id := null;
        v_match_archived := null;
        select l.id, l.archived
          into v_match_id, v_match_archived
          from public.leads l
         where l.organization_id = p_organization_id
           and (   public.lead_key_email(l.email) = k_email
                or public.lead_key_phone(l.phone) = any (k_numbers)
                or public.lead_key_phone(l.social_whatsapp) = any (k_numbers)
                or public.lead_key_website(l.website) = k_website
                or public.lead_key_facebook(l.social_facebook) = k_facebook
                or public.lead_key_instagram(l.social_instagram) = k_instagram
                or public.lead_key_google(l.social_google_business) = k_google)
         order by l.archived, l.created_at
         limit 1;

        if v_match_id is not null then
            -- Skipped, never overwritten, and an archived match stays
            -- archived: the Resurrection Engine is for the webhook only.
            outcome := 'DUPLICATE';
            lead_id := v_match_id;
            lead_archived := v_match_archived;
            return next;
            continue;
        end if;

        v_new_id := null;
        insert into public.leads (
            organization_id,
            client_name,
            email,
            phone,
            company,
            website,
            physical_address,
            social_google_business,
            social_facebook,
            social_instagram,
            social_whatsapp,
            lead_source,
            service_category,
            ai_brief,
            estimated_revenue,
            status,
            next_action_at
        )
        values (
            -- From the parameter the membership check validated, never from
            -- the row payload.
            p_organization_id,
            v_name,
            v_email,
            v_phone,
            v_company,
            v_website,
            nullif(btrim(r.physical_address), ''),
            v_google,
            v_facebook,
            v_instagram,
            v_whatsapp,
            v_lead_source,
            v_service_category,
            nullif(btrim(r.ai_brief), ''),
            coalesce(r.estimated_revenue, 0),
            coalesce(nullif(btrim(r.status), ''), 'NEW'),
            coalesce(r.next_action_at, now() + interval '24 hours')
        )
        -- Backstop for a race with another writer on the same email; the
        -- lookup above already caught every match that existed before it.
        on conflict (organization_id, lower(email)) do nothing
        returning id into v_new_id;

        if v_new_id is null then
            select l.id, l.archived
              into v_match_id, v_match_archived
              from public.leads l
             where l.organization_id = p_organization_id
               and lower(l.email) = v_email;
            outcome := 'DUPLICATE';
            lead_id := v_match_id;
            lead_archived := v_match_archived;
            return next;
            continue;
        end if;

        -- Every lead gets its first submission row, email or not. Mirrors
        -- toRow() in src/lib/submissions/record.ts column for column — change
        -- both. A CSV row has no message and no raw body.
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
            v_new_id,
            p_organization_id,
            v_name,
            v_email,
            v_phone,
            v_company,
            null,
            v_service_category,
            v_lead_source,
            null
        );

        outcome := 'INSERTED';
        lead_id := v_new_id;
        lead_archived := false;
        return next;
    end loop;
end;
$$;

revoke all on function public.import_leads_chunk(uuid, jsonb) from public, anon;
grant execute on function public.import_leads_chunk(uuid, jsonb) to authenticated;
