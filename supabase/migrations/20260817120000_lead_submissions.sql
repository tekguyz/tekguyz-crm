-- lead_submissions — the immutable log of every inbound enquiry.
--
-- WHY THIS TABLE EXISTS
-- ingestWebhookLead looked a lead up by (organization_id, email) and then
-- overwrote client_name / company / website / physical_address /
-- service_category / lead_source in place with each new enquiry. Lead
-- 510c28db was progressively rewritten from "Alex Rivera / Rivera Stone Co"
-- into "Diagnostic Probe / TEKGUYZ Diagnostics" by later probes reusing the
-- same email — real, silent identity loss with no error and no audit trail.
-- Decision recorded in docs/ADDENDA_LOG.md § 2026-08-16 Wave decisions:
--   * leads stays exactly one row per (organization_id, lower(email)) contact,
--     so unique_tenant_client_email_ci is preserved rather than worked around,
--     and no pipeline/contacts query has to de-duplicate.
--   * the per-enquiry payload (message, service_category, lead_source, the raw
--     body) moves here, one row per enquiry, append-only.
--   * this is also the home for `message`, which leads has never had — and it
--     lands without the EditLeadModal field-parity plumbing a leads.message
--     column would drag in (see CLAUDE.md § Form/Action Field Parity).
--   * the Spam Shield gets an auditable per-enquiry input instead of a lead row
--     that has already been overwritten by the time anyone reviews the verdict.
--
-- WHY THE COLUMNS ARE DENORMALIZED RATHER THAN raw_payload ALONE
-- raw_payload keeps the exact body for audit, but a jsonb-only table would
-- force every reader to parse JSON to render a list — the same mistake the
-- Spam Shield is being moved off of (it currently has to read a WEBHOOK
-- activity_logs row whose content is a JSON string). The named columns are the
-- read path; raw_payload is the receipt.
--
-- WHY APPEND-ONLY, ENFORCED BY OMISSION
-- No UPDATE/DELETE policy and no UPDATE/DELETE grant, exactly like
-- activity_logs. A submission is a record of what a visitor actually said at a
-- point in time; editing one would make it useless as evidence. RLS denies by
-- default, so the absence of a policy IS the enforcement — there is deliberately
-- nothing here to "turn off" later by accident.
--
-- RLS SHAPE: mirrors leads/activity_logs/tasks byte-for-byte — plain
-- `organization_id in (select private.current_org_ids())`, with the paired
-- WITH CHECK on INSERT (an INSERT policy takes WITH CHECK only; there is no
-- USING half to pair on this table because there is no UPDATE policy). No
-- role-based EXISTS check: leads INSERT keeps full MEMBER parity by design,
-- and a submission is strictly less privileged than the lead it hangs off.

create table public.lead_submissions (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references public.leads(id) on delete cascade,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    -- Denormalized snapshots of what THIS enquiry said. They are deliberately
    -- not FKs or generated columns: the point is that they never change when
    -- the leads row changes, and never change the leads row either.
    client_name text not null,
    email text not null,
    phone text default null,
    company text default null,
    message text default null,
    service_category text default null,
    lead_source text default null,
    -- Nullable: only the webhook path has a raw body. createLead and CSV
    -- import synthesize a submission from their own inputs and have no
    -- external payload to record, so a NOT NULL default '{}' here would be a
    -- fake receipt rather than an honest absence.
    raw_payload jsonb default null,
    created_at timestamptz not null default now()
);

alter table public.lead_submissions enable row level security;

-- No update/delete grant at all — immutable by design, same stance as
-- activity_logs (20260707215320) and the app-wide no-hard-deletes rule.
grant select, insert on public.lead_submissions to authenticated;

create policy "Members read tenant submissions" on public.lead_submissions
    for select using (organization_id in (select private.current_org_ids()));

create policy "Members create tenant submissions" on public.lead_submissions
    for insert with check (organization_id in (select private.current_org_ids()));

-- Matches the read the profile sheet actually issues: every submission for one
-- lead, newest first. Same shape as idx_logs_chronological_stream.
create index idx_submissions_chronological on public.lead_submissions(lead_id, created_at desc);
