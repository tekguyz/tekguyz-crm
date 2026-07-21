-- Phase 3 (Prompt 7): activity_logs — the chronological, immutable activity
-- stream backing the customer profile sheet's timeline viewer. Deferred from
-- the original Prompt 2 plan (see CLAUDE.md section 2 note); created now that
-- the profile sheet is actually being built.

create table public.activity_logs (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references public.leads(id) on delete cascade,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    log_type text not null,
    content text not null,
    audio_url text default null,
    created_at timestamptz not null default now(),
    constraint check_valid_log_type check (log_type in ('WEBHOOK', 'MANUAL_NOTE', 'AUDIO_TRANSCRIPT', 'SYSTEM_ALERT'))
);

alter table public.activity_logs enable row level security;

grant select, insert on public.activity_logs to authenticated;
-- No UPDATE/DELETE grant or policy at all — logs are immutable by design,
-- consistent with the Resurrection Engine's no-hard-deletes stance elsewhere.

create policy "Members read tenant logs" on public.activity_logs
    for select using (organization_id in (select private.current_org_ids()));

create policy "Members create tenant logs" on public.activity_logs
    for insert with check (organization_id in (select private.current_org_ids()));

create index idx_logs_chronological_stream on public.activity_logs(lead_id, created_at desc);
