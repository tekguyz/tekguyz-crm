-- Prompt 15a: idempotency guard for the weekly report cron
-- (src/app/api/cron/weekly-report/route.ts). Directly informed by a real
-- incident this build hit: Vercel's Cron dashboard "Run" button is a real
-- production trigger, not a dry run, and clicking it to "check if it works"
-- fired the same live email seven times in 28 minutes. A unique constraint
-- on (organization_id, week_start) is the hard backstop — the route checks
-- for an existing row before sending and records one after a successful
-- send, but even if two overlapping invocations both pass that check, only
-- one INSERT can ever succeed for the same org/week.

create table public.report_sends (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    week_start date not null,
    sent_at timestamptz not null default now(),
    constraint unique_org_week_send unique (organization_id, week_start)
);

-- Same access pattern as organization_credentials: this table is only ever
-- touched by the cron route's admin (service-role) client, never by a
-- client-side query. RLS enabled with zero policies means service_role
-- (which bypasses RLS) is the only path in — no anon/authenticated grants.
alter table public.report_sends enable row level security;
