-- Per-lead ownership: leads.assigned_to.
--
-- Closes the KNOWN_GAPS bullet "leads has no assigned_to column and no per-row
-- ownership concept anywhere in the schema" (noted 2026-08-14 while closing the
-- role-enforcement gap). It is a feature, not a security fix: VISIBILITY DOES
-- NOT CHANGE. Every role still SELECTs every lead in the tenant. "A MEMBER sees
-- only their own leads" is a separate, unmade scope decision and deliberately
-- not expressed here — nothing below narrows any SELECT policy.
--
-- WHY ON DELETE SET NULL
-- The only referential event a foreign key can see here is an auth.users row
-- being deleted outright. When that happens the lead itself must survive — it
-- is tenant data, not user data — so the assignment is dropped and the lead
-- becomes unassigned rather than the delete being blocked (RESTRICT would make
-- deleting a departed user impossible while any lead still names them) or the
-- lead disappearing (CASCADE would delete real customer records, which this
-- schema never does; see the Resurrection Engine in CLAUDE.md).
--
-- This FK deliberately does NOT fire on organization_members removal. Taking
-- someone off a team is not deleting their auth user, and no FK to auth.users
-- can observe it. Cleaning up assignments on member removal is Prompt 2's job
-- and needs application/RPC logic, not a constraint.

alter table public.leads
    add column if not exists assigned_to uuid null
        references auth.users(id) on delete set null;

comment on column public.leads.assigned_to is
    'Organization member who owns this lead, or NULL when unassigned. Constrained '
    'to a member of the lead''s own organization by '
    'trigger_enforce_lead_assignee_membership. Never written by the inbound '
    'webhook — an external caller must not be able to route a lead at a named '
    'person.';

-- Backs both the FK (an unindexed FK column makes the ON DELETE SET NULL scan
-- the whole table) and the "My Leads" filter, which is always
-- organization_id + assigned_to together because every lead query is
-- tenant-scoped first. Partial for the same reason as idx_leads_starred_nodes:
-- most leads are unassigned, and those NULLs are dead weight in the index.
create index if not exists idx_leads_tenant_assignee
    on public.leads (organization_id, assigned_to)
    where assigned_to is not null;

-- WHY A TRIGGER, AND NOT AN APP-LEVEL CHECK OR AN RLS CLAUSE
-- The rule is "assigned_to must name a member of THIS lead's organization".
--
-- Not the Server Action: updateLead is not the only writer. The webhook
-- Resurrection Engine, the seed scripts and public.import_leads_chunk all write
-- leads through service-role, which bypasses RLS *and* never runs app code. A
-- check in updateLead would guard exactly one of four write paths.
--
-- Not RLS: CLAUDE.md forbids giving this column its own policy, and folding the
-- condition into the existing "Members write tenant leads" USING/WITH CHECK
-- pair would mean editing the live tenant boundary for a rule that is not about
-- tenancy of the CALLER. RLS is also bypassed by service-role, so it would
-- leave the same three writers unguarded.
--
-- A BEFORE INSERT OR UPDATE trigger is the only layer every writer passes
-- through. It is also the same shape this schema already uses for the one other
-- rule RLS could not express — see enforce_lead_role_restrictions in
-- 20260814120000_leads_member_role_enforcement.sql.
--
-- WHY SECURITY INVOKER
-- public.organization_members' SELECT policy is
--   organization_id IN (SELECT private.current_org_ids())
-- so an authenticated member can already read EVERY member row of their own
-- org, not just their own — which is exactly what this lookup needs, since the
-- assignee is usually somebody else. No elevation is required, and the Supabase
-- security checklist prefers INVOKER. The failure direction is safe either way:
-- a read restricted by RLS can only ever return FEWER rows, which makes the
-- EXISTS below fail and the write reject. Fail-closed, never fail-open.
-- search_path is pinned to '' per 20260721130000_pin_function_search_path.sql;
-- every reference below is schema-qualified.
--
-- WHY NO auth.uid() IS NULL EXEMPTION
-- enforce_lead_role_restrictions exempts service-role because it asks "who is
-- calling, and are they allowed to do this" — a question with no answer when
-- there is no end-user identity. This trigger asks "is the assignee a member of
-- this org", which is a data-integrity fact about the row itself. It has the
-- same answer for every caller, so it is enforced for every caller, service-role
-- included. RLS bypass is not trigger bypass, and here that is the point.

create or replace function public.enforce_lead_assignee_membership()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    -- Unassigned is always legal, on both INSERT and UPDATE. This is also what
    -- keeps every existing writer that has never heard of this column — the
    -- webhook, the CSV import RPC, the seed scripts — completely unaffected.
    if new.assigned_to is null then
        return new;
    end if;

    -- Fast path, and a correctness requirement rather than only a speed one:
    -- updateLead re-sends assigned_to on EVERY save, so without this an
    -- ordinary edit of an already-assigned lead would re-run the membership
    -- lookup each time — and, more importantly, would start failing the moment
    -- Prompt 2 removes a member without clearing their assignments, blocking
    -- unrelated edits to a lead nobody is trying to reassign. IS DISTINCT FROM
    -- is null-safe; plain <> would return NULL and fall through.
    -- organization_id is compared too so a row moved between tenants is
    -- re-checked, even though no app path writes that column today.
    if tg_op = 'UPDATE'
   and new.assigned_to     is not distinct from old.assigned_to
   and new.organization_id is not distinct from old.organization_id then
        return new;
    end if;

    -- Same EXISTS shape as enforce_lead_role_restrictions and the
    -- organizations UPDATE policy; served by unique_org_member. Checked against
    -- NEW.organization_id, not OLD: on an INSERT there is no OLD, and on an
    -- UPDATE the org the row is being written INTO is the one whose membership
    -- must contain the assignee.
    -- Deliberately no role filter — a lead may be assigned to a MEMBER just as
    -- freely as to an OWNER. This is ownership, not privilege.
    if exists (
        select 1 from public.organization_members m
        where m.organization_id = new.organization_id
          and m.user_id = new.assigned_to
    ) then
        return new;
    end if;

    -- Raised, never silently coerced to NULL. A BEFORE trigger that quietly
    -- rewrote assigned_to to NULL would report success while discarding the
    -- user's choice — the same "the data does not match what the user saw"
    -- failure mode as the silent-NULL-on-save bug (CLAUDE.md § Form/Action
    -- Field Parity). Raising aborts the whole statement instead.
    -- errcode 23514 (check_violation): this is a data-integrity violation, not
    -- a permission one, so it is deliberately NOT the 42501 the role trigger
    -- uses — the two must stay distinguishable, and PostgREST maps this to a
    -- 400 rather than a 403. The LEAD_ASSIGNEE_NOT_MEMBER: prefix is a stable
    -- sentinel matched by src/lib/leads/role-errors.ts; keep the two in sync.
    raise exception 'LEAD_ASSIGNEE_NOT_MEMBER: a lead can only be assigned to a member of the organization that owns it.'
        using errcode = '23514';
end;
$$;

-- CREATE OR REPLACE so re-running this file is a no-op rather than an error.
create or replace trigger trigger_enforce_lead_assignee_membership
    before insert or update on public.leads
    for each row
    execute function public.enforce_lead_assignee_membership();
