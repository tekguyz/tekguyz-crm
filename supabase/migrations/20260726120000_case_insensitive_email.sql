-- Replaces the case-sensitive unique_tenant_client_email constraint with a
-- case-insensitive one. Postgres UNIQUE constraints compare TEXT
-- byte-for-byte, so "Jane@X.com" and "jane@x.com" were previously two
-- distinct leads within the same org — a real gap found while building CSV
-- import (see docs/ADDENDA_LOG.md, Prompt 10 addendum: CSV import lowercases
-- at the Zod layer before this constraint ever sees a value; the webhook
-- path and the manual createLead/updateLead actions do not, so a
-- case-mismatched resubmission could create a duplicate lead or silently
-- miss the Resurrection Engine).
--
-- Confirmed before writing this migration (2026-07-26): the real TEKGUYZ org
-- has 0 leads; TEKGUYZ Demo has 20 leads from a reseed-able fixture script.
-- No collision-detection/backfill logic is included — there is no existing
-- mixed-case duplicate data to reconcile, and writing that logic against a
-- guess instead of real data would be speculative. If this constraint is
-- ever swapped again with real customer data present, write that logic
-- then, against the real rows.
--
-- Verified before dropping: the only FK referencing `leads` is
-- activity_logs_lead_id_fkey, which points at the primary key (`id`), not
-- this constraint or its columns. No other index, trigger, or RLS policy
-- references unique_tenant_client_email by name or by (organization_id,
-- email). Safe to drop outright.

-- Both orgs' lead data is wiped rather than migrated in place, per explicit
-- authorization — there is no real customer data in either org today.
-- activity_logs.lead_id has ON DELETE CASCADE (confirmed in
-- 20260707215320_activity_logs.sql), so no separate activity_logs delete is
-- needed.
DELETE FROM public.leads;

ALTER TABLE public.leads DROP CONSTRAINT unique_tenant_client_email;

-- Named distinctly (_ci suffix), not reusing the old name, so a future
-- reader can tell at a glance this is the case-insensitive version.
CREATE UNIQUE INDEX unique_tenant_client_email_ci
    ON public.leads (organization_id, lower(email));
