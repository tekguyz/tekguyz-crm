-- prospects promotion — the two columns Prompt 1 deliberately left out.
--
-- Additive only. Two nullable columns and one index, all on public.prospects.
-- Nothing here touches public.leads DDL, its three RLS policies,
-- unique_tenant_client_email_ci, enforce_lead_role_restrictions,
-- enforce_lead_assignee_membership, import_leads_chunk, import_prospects_chunk,
-- organization_members, or any vault object.
--
-- NO NEW RLS POLICY IS NEEDED, AND NONE SHOULD BE ADDED.
-- prospects' existing three policies ("Members read tenant prospects",
-- "Members create tenant prospects", "Members write tenant prospects") have no
-- column-level gate at all — they are plain
-- `organization_id in (select private.current_org_ids())`. A new column on the
-- table is therefore already covered by the UPDATE policy's paired
-- USING/WITH CHECK, exactly the way tasks.dismissed was covered by tasks'
-- existing UPDATE policy in 20260819120000_tasks_dismissed.sql. The table's
-- grants (select, insert, update to authenticated; no delete grant, no delete
-- policy) are likewise unchanged and still correct.
--
-- promoted_lead_id IS THE ONLY SOURCE OF TRUTH FOR "ALREADY PROMOTED".
-- status already carries a 'CONVERTED' value from check_valid_prospect_status,
-- and that CHECK's value list is NOT changed here. But a status string is a
-- label an operator can set by hand from a dropdown; it cannot carry the
-- identity of the lead that was created, and nothing stops it being set twice.
-- promoted_lead_id can only ever be written by the promotion path, and the
-- app's guard is a single statement:
--
--   update public.prospects
--      set status = 'CONVERTED', promoted_lead_id = $1
--    where id = $2 and promoted_lead_id is null;
--
-- One statement is one transaction, so the two columns can never disagree, and
-- the `is null` predicate makes a second promotion affect zero rows rather than
-- overwrite the first one's lead id. Every read that asks "can this still be
-- promoted" must test promoted_lead_id, never the status string.

alter table public.prospects
    -- Free-text call notes. Nullable and unconstrained on purpose: this is what
    -- the operator scribbles between calls ("gatekeeper, try after 4"), not a
    -- structured field anything queries on.
    add column if not exists notes text,

    -- ON DELETE SET NULL, never CASCADE. Deleting a lead must not delete the
    -- prospect that produced it — the prospect is the record that this business
    -- was called at all, and losing it would silently reopen the same "we have
    -- no idea whether we already contacted them" hole the table exists to close.
    -- The row simply becomes promotable again, which is the honest outcome.
    add column if not exists promoted_lead_id uuid
        references public.leads(id) on delete set null;

-- Postgres does not index a referencing FK column automatically. Without this,
-- every `on delete set null` fired by a lead deletion sequentially scans the
-- whole prospects table to find rows pointing at that lead, and so does the
-- "which prospect produced this lead" lookup.
--
-- Partial, matching the shape of the sibling idx_prospects_possible_duplicate
-- from 20260826120000_prospects.sql: an unpromoted prospect is the overwhelming
-- majority of rows and is never the target of either query. The cascade's own
-- predicate is `promoted_lead_id = <id>`, which implies not-null, so the
-- planner can still use this index for it.
create index if not exists idx_prospects_promoted_lead
    on public.prospects (promoted_lead_id)
    where promoted_lead_id is not null;
