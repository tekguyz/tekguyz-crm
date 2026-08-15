-- Leads MEMBER-role enforcement: restrict archiving and deal-closing to
-- OWNER/ADMIN. Closes the "leads CRUD has zero role enforcement" gap, which
-- was deferred on 2026-07-22 purely because no MEMBER-role users existed yet.
-- Two now do (TEKGUYZ Demo), so the deferral's own trigger condition has fired.
--
-- WHY A TRIGGER AND NOT A POLICY
-- RLS WITH CHECK evaluates the *resulting row*, not a column-level diff, so it
-- cannot express "reject only if these four columns changed" — it would have to
-- reject every UPDATE a MEMBER makes on any already-closed or already-archived
-- lead, which is not the rule we want. A BEFORE UPDATE trigger comparing OLD vs
-- NEW is the idiomatic fix, and this schema already has exactly that shape in
-- public.sync_modified_timestamp(). The tenant boundary is unchanged and still
-- lives where it always has: the paired USING/WITH CHECK on "Members write
-- tenant leads". This trigger only adds a column-level role gate on top of it.
-- Deliberately no change to the SELECT or INSERT policies — a MEMBER keeps
-- full tenant-wide visibility and unrestricted lead creation.
--
-- WHY SECURITY INVOKER
-- public.organization_members already grants SELECT to authenticated and its
-- "Members read own membership rows" policy resolves through the SECURITY
-- DEFINER helper private.current_org_ids(), so a member can read the role rows
-- of their own org without elevation. Adding SECURITY DEFINER here would remove
-- access control for no gain (Supabase security checklist: prefer INVOKER).
-- search_path is pinned to '' per 20260721130000_pin_function_search_path.sql;
-- every reference below is schema-qualified.

create or replace function public.enforce_lead_role_restrictions()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_uid uuid := (select auth.uid());
begin
    -- Fast path: nothing restricted actually changed. This matters for more
    -- than performance — updateLead() writes outcome/actual_revenue/closed_at
    -- on EVERY save, re-sending the values already stored. IS DISTINCT FROM is
    -- what keeps an ordinary MEMBER edit of an already-closed lead legal, and
    -- it is null-safe (plain <> would return NULL and fall through).
    if new.archived      is not distinct from old.archived
   and new.outcome       is not distinct from old.outcome
   and new.actual_revenue is not distinct from old.actual_revenue
   and new.closed_at     is not distinct from old.closed_at then
        return new;
    end if;

    -- No end-user identity on the connection: service-role and the SQL editor
    -- both resolve auth.uid() to NULL. Exempt on purpose — the webhook
    -- Resurrection Engine (lib/webhooks/ingest-lead.ts) flips archived back to
    -- false through createWebhookServiceClient(), and the seed/reset scripts
    -- write fixtures the same way. Neither has, or should need, a member role.
    if v_uid is null then
        return new;
    end if;

    -- Checked against OLD.organization_id, not NEW: the org that currently owns
    -- the row is the one whose reported revenue is at stake. No app path ever
    -- writes organization_id, and the paired WITH CHECK already confines both
    -- sides to the caller's own orgs, so the two are identical in practice —
    -- OLD is simply the stricter reading of the two.
    -- Fail-closed: only an explicit OWNER/ADMIN membership row permits the
    -- write. Same EXISTS shape as the organizations UPDATE policy and both
    -- organization_invites policies; indexed by unique_org_member.
    if exists (
        select 1 from public.organization_members m
        where m.organization_id = old.organization_id
          and m.user_id = v_uid
          and m.role in ('OWNER', 'ADMIN')
    ) then
        return new;
    end if;

    -- Raised, never silently skipped: a BEFORE trigger that returned NULL would
    -- drop the row's update and report success, which is the same
    -- data-doesn't-match-what-the-user-saw failure mode as the silent-NULL-on-
    -- save bug (CLAUDE.md § Form/Action Field Parity). Raising aborts the whole
    -- statement, so a mixed restricted + unrestricted UPDATE cannot part-write.
    -- errcode 42501 (insufficient_privilege) is what PostgREST maps to HTTP 403.
    -- The LEAD_ROLE_DENIED: prefix is a stable sentinel the Server Actions match
    -- on — a bare 42501 is ambiguous, since a plain RLS denial uses it too.
    raise exception 'LEAD_ROLE_DENIED: only an owner or admin can archive a lead or change its close outcome, revenue, or close date.'
        using errcode = '42501';
end;
$$;

-- Fires before trigger_update_leads_timestamp (same BEFORE UPDATE timing, and
-- Postgres orders same-timing triggers alphabetically) — irrelevant to
-- correctness either way, since raising aborts the statement outright.
-- CREATE OR REPLACE so re-running this file is a no-op rather than an error.
create or replace trigger trigger_enforce_lead_role_restrictions
    before update on public.leads
    for each row
    execute function public.enforce_lead_role_restrictions();
