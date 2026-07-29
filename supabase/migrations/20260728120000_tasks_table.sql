-- Task/Calendar v1 (Prompt 1 of 4): tasks table, lead-scoped, tenant-isolated.
-- Mirrors the leads RLS shape exactly (private.current_org_ids(), paired
-- WITH CHECK on writes, no role-based EXISTS check) — zero role enforcement
-- by design, same precedent as leads. Reuses public.sync_modified_timestamp()
-- for updated_at; no new trigger function. No DELETE policy — completion is
-- a state flip (completed = true), not a row removal, matching this app's
-- no-hard-deletes discipline (Contacts Active/Archived precedent).

create table public.tasks (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    lead_id uuid not null references public.leads(id) on delete cascade,
    title text not null,
    description text default null,
    due_at timestamptz not null,
    completed boolean not null default false,
    completed_at timestamptz default null,
    created_by uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Tenant members select their tasks" on public.tasks
    for select using (organization_id in (select private.current_org_ids()));

create policy "Tenant members insert their tasks" on public.tasks
    for insert with check (organization_id in (select private.current_org_ids()));

create policy "Tenant members update their tasks" on public.tasks
    for update
    using (organization_id in (select private.current_org_ids()))
    with check (organization_id in (select private.current_org_ids()));

-- No DELETE policy — completion is a state flip (completed=true), not a
-- row removal, matching this app's no-hard-deletes discipline (Contacts
-- Active/Archived precedent).

create index idx_tasks_org_due on public.tasks(organization_id, due_at) where completed = false;
create index idx_tasks_lead_id on public.tasks(lead_id, completed);

create trigger trigger_update_tasks_timestamp
    before update on public.tasks
    for each row
    execute function public.sync_modified_timestamp();

grant select, insert, update on public.tasks to authenticated;
