-- Phase 2: leads table — the central sales & operations ledger.
-- activity_logs and its policies/indexes are introduced in Phase 3 alongside
-- the customer profile sheet / activity stream.

create table public.leads (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    client_name text not null,
    email text not null,
    phone text default null,
    company text default null,
    website text default null,
    physical_address text default null,
    social_google_business text default null,
    social_facebook text default null,
    social_instagram text default null,
    lead_source text default null,
    service_category text default null,
    estimated_revenue numeric(12, 2) not null default 0.00,
    status text not null default 'NEW',
    outcome text default null,
    closed_at timestamptz default null,
    actual_revenue numeric(12, 2) default null,
    next_action_at timestamptz not null default (now() + interval '24 hours'),
    ai_brief text default null,
    is_starred boolean not null default false,
    archived boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint check_valid_status check (status in ('NEW', 'DISCOVERY', 'QUOTED', 'ACTIVE')),
    constraint check_valid_outcome check (outcome is null or outcome in ('WON', 'LOST', 'ABANDONED')),
    constraint unique_tenant_client_email unique (organization_id, email)
);

create or replace function public.sync_modified_timestamp()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trigger_update_leads_timestamp
    before update on public.leads
    for each row
    execute function public.sync_modified_timestamp();

grant select, insert, update on public.leads to authenticated;

alter table public.leads enable row level security;

create policy "Members read tenant leads" on public.leads
    for select using (organization_id in (select private.current_org_ids()));

create policy "Members create tenant leads" on public.leads
    for insert with check (organization_id in (select private.current_org_ids()));

create policy "Members write tenant leads" on public.leads
    for update
    using (organization_id in (select private.current_org_ids()))
    with check (organization_id in (select private.current_org_ids()));

create index idx_leads_tenant_status on public.leads(organization_id, status);
create index idx_leads_sla_deadline on public.leads(organization_id, next_action_at) where archived = false;
create index idx_leads_starred_nodes on public.leads(organization_id) where is_starred = true;
create index idx_leads_outcome_revenue on public.leads(organization_id, outcome, closed_at);
