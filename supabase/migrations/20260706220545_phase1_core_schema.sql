-- Phase 1: Multi-tenant core schema
-- organizations, organization_members, organization_credentials + RLS foundations
-- Leads, activity_logs, and their policies/indexes are introduced in a later phase.

create extension if not exists "uuid-ossp";
create extension if not exists "pgsodium";

-- 1. ORGANIZATIONS TABLE (Tenant Core — no credentials stored here)

create table public.organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    webhook_secret uuid not null default gen_random_uuid() unique,
    timezone text not null default 'UTC',
    currency_format text not null default 'USD',
    created_at timestamptz not null default now()
);

-- 2. ORGANIZATION MEMBERS TABLE (User <-> Tenant Mapping)

create table public.organization_members (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'MEMBER',
    created_at timestamptz not null default now(),
    constraint check_valid_role check (role in ('OWNER', 'ADMIN', 'MEMBER')),
    constraint unique_org_member unique (organization_id, user_id)
);

-- 3. ORGANIZATION CREDENTIALS TABLE (Vaulted BYO Keys — service_role only)

create table public.organization_credentials (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null unique references public.organizations(id) on delete cascade,
    api_key_gemini text default null,
    api_key_openai text default null,
    api_key_anthropic text default null,
    token_resend text default null,
    token_twilio text default null,
    updated_at timestamptz not null default now()
    -- NOTE: values encrypted at rest via Supabase Vault / pgsodium.
    -- Encryption implementation finalized when this table is first written to.
);

-- 4. TENANT RESOLUTION FUNCTION (Used by every RLS policy below, and by every
--    tenant-scoped policy added in later phases)
--
-- NOTE: hosted Supabase does not allow creating objects in the `auth` schema
-- from the SQL Editor (it's a Supabase-managed schema). This helper lives in
-- a dedicated `private` schema instead — never added to the API-exposed
-- schema list, so it's unreachable via PostgREST regardless of grants.

create schema if not exists private;

create or replace function private.current_org_ids()
returns setof uuid
language sql security definer stable
as $$
    select organization_id from public.organization_members
    where user_id = auth.uid();
$$;

-- 5. PRODUCTION DATA ROLE ACCESS PROVISIONING

alter default privileges revoke execute on functions from public;

grant usage on schema private to authenticated;
grant execute on function private.current_org_ids() to authenticated;

grant select, insert, update on public.organizations to authenticated;
grant select, insert on public.organization_members to authenticated;

-- NOTE: organization_credentials receives NO grants to anon/authenticated.
-- Access is service_role only, via Server Actions.

-- 6. ROW LEVEL SECURITY (RLS) MULTI-TENANT ISOLATION POLICIES

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_credentials enable row level security;

create policy "Members read own organizations" on public.organizations
    for select using (id in (select private.current_org_ids()));

create policy "Members read own membership rows" on public.organization_members
    for select using (organization_id in (select private.current_org_ids()));

-- NOTE: organization_credentials has RLS enabled but intentionally NO policies
-- for anon/authenticated — this makes the table unreadable/unwritable by those
-- roles by default, leaving service_role (which bypasses RLS) as the only path in.
--
-- NOTE: organization creation (organizations row + creating user's OWNER
-- organization_members row) is not covered by an authenticated INSERT policy
-- here — per the CLAUDE.md migration note, it is performed by a service-role
-- Server Action in the same transaction, so no client-facing INSERT policy is
-- needed for either table at this phase.

-- 7. INDEXES

create index idx_org_webhook_secret on public.organizations(webhook_secret);
