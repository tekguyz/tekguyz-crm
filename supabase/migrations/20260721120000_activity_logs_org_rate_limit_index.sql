-- Phase 4 (Prompt 11): the webhook ingestion route rate-limits inbound
-- traffic per tenant by counting recent activity_logs WEBHOOK rows for an
-- organization_id. The existing idx_logs_chronological_stream index is
-- (lead_id, created_at desc) — built for the profile sheet's per-lead
-- timeline, not an org-wide scan — so it doesn't serve this query well.
-- This adds a dedicated index for the rate-limit lookup.

create index idx_logs_org_type_time
    on public.activity_logs(organization_id, log_type, created_at desc);
