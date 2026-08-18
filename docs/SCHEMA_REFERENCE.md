# TEKGUYZ CRM: DATABASE SCHEMA REFERENCE

Moved verbatim out of `CLAUDE.md` during the 2026-07-26 restructure (see that file's Reference Index). Nothing below was reworded — this is the exact "2. PREMIUM MULTI-TENANT POSTGRESQL SCHEMA" section that used to live in `CLAUDE.md`, including its own internal "2." numbering, which is now local to this file rather than continuous with `CLAUDE.md`'s section numbers.

---

## 2. PREMIUM MULTI-TENANT POSTGRESQL SCHEMA

This section is the live schema, reconciled directly against the Supabase project — not a snapshot of the original Prompt 2 plan. Table/column existence and RPC signatures below were confirmed against the project's live PostgREST OpenAPI root (`/rest/v1/`); full DDL (policies, function bodies, indexes, constraints — none of which PostgREST introspection exposes) comes from the migration files actually applied, in `supabase/migrations/`. No direct Postgres/pg_catalog access (no Supabase CLI, no DB connection string) was available at the time of this reconciliation, so this was as close to "dump the live database" as achievable without one — if a policy or function was ever hand-edited via the dashboard SQL Editor outside a migration file, this block would not catch that drift. **Note: an `activity_logs` migration (table, RLS, index) was applied directly via Supabase MCP during Prompt 7, after this reconciliation — see the Prompt 7 addendum below the SQL block.**

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgsodium";
CREATE EXTENSION IF NOT EXISTS "supabase_vault"; -- added Prompt 13a; pgsodium above is its dependency

-- 1. ORGANIZATIONS TABLE (unchanged from the original Prompt 2 plan)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    webhook_secret UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    currency_format TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ORGANIZATION MEMBERS TABLE (unchanged)
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_valid_role CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
    CONSTRAINT unique_org_member UNIQUE (organization_id, user_id)
);

-- 3. ORGANIZATION CREDENTIALS TABLE — column shape changed in Prompt 13a.
--    Originally five plain TEXT columns (shown as struck-through history
--    below); replaced with UUID pointers into vault.secrets once Prompt 13a
--    became the first feature to actually write real secrets here. See the
--    Prompt 13a addendum for the two SECURITY DEFINER RPCs
--    (vault_set_org_credential / vault_get_org_credential) that are now the
--    only path to read or write a value — full DDL in
--    supabase/migrations/20260722140000_vault_encrypt_credentials.sql.
CREATE TABLE public.organization_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
    api_key_gemini_secret_id UUID REFERENCES vault.secrets(id),
    api_key_openai_secret_id UUID REFERENCES vault.secrets(id),
    api_key_anthropic_secret_id UUID REFERENCES vault.secrets(id),
    token_resend_secret_id UUID REFERENCES vault.secrets(id),
    token_twilio_secret_id UUID REFERENCES vault.secrets(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. LEADS TABLE (unchanged — The Central Sales & Operations Ledger)
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT DEFAULT NULL,
    company TEXT DEFAULT NULL,
    website TEXT DEFAULT NULL,
    physical_address TEXT DEFAULT NULL,
    social_google_business TEXT DEFAULT NULL,
    social_facebook TEXT DEFAULT NULL,
    social_instagram TEXT DEFAULT NULL,
    lead_source TEXT DEFAULT NULL,
    service_category TEXT DEFAULT NULL,
    estimated_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'NEW',
    outcome TEXT DEFAULT NULL,
    closed_at TIMESTAMPTZ DEFAULT NULL,
    actual_revenue NUMERIC(12, 2) DEFAULT NULL,
    next_action_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    ai_brief TEXT DEFAULT NULL,
    is_starred BOOLEAN NOT NULL DEFAULT FALSE,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    -- Added 2026-08-18 (migration 20260818120000_leads_assigned_to.sql). Per-lead
    -- ownership, NULL when unassigned. ON DELETE SET NULL fires only on auth.users
    -- deletion — organization_members removal is a different event no FK can see.
    -- Constrained to a member of THIS lead's organization by
    -- trigger_enforce_lead_assignee_membership (Section 14). It is ownership, not
    -- visibility: no RLS policy reads it, and full tenant-wide SELECT is unchanged.
    assigned_to UUID DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_valid_status CHECK (status IN ('NEW', 'DISCOVERY', 'QUOTED', 'ACTIVE')),
    CONSTRAINT check_valid_outcome CHECK (outcome IS NULL OR outcome IN ('WON', 'LOST', 'ABANDONED'))
    -- Tenant-scoped email uniqueness is enforced by unique_tenant_client_email_ci,
    -- a case-insensitive UNIQUE INDEX in Section 13 below, not an inline
    -- table constraint — see that index's comment for why (Prompt 10's
    -- email-case-sensitivity gap, migration 20260726120000).
);

-- 5. ORGANIZATION INVITES TABLE — NOT in the original Prompt 2 plan. Added as
--    necessary product infrastructure once org creation went live (orgs were
--    otherwise permanently single-user). No Resend integration exists yet
--    (that's Phase 4), so creating an invite does not send email — the
--    inviter copies the accept-link and shares it themselves.
CREATE TABLE public.organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'MEMBER',
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    CONSTRAINT check_valid_invite_role CHECK (role IN ('ADMIN', 'MEMBER')),
    CONSTRAINT check_valid_invite_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REVOKED'))
);

-- 6. TENANT RESOLUTION FUNCTION (used by every RLS policy in this file)
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.current_org_ids()
RETURNS SETOF UUID
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid();
$$;

-- 7. LEADS TIMESTAMP TRIGGER (unchanged)
CREATE OR REPLACE FUNCTION public.sync_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leads_timestamp
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_modified_timestamp();

-- 8. ORGANIZATION CREATION RPC — built differently than the original Prompt 2
--    migration note specified (see the reconciled note at the end of this
--    section). SECURITY DEFINER, called from the signup/onboarding Server
--    Action; reads auth.uid() internally rather than accepting a
--    caller-supplied user id, so it can only ever make the calling user the
--    OWNER of a brand-new org.
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;

    INSERT INTO public.organizations (name)
    VALUES (p_name)
    RETURNING id INTO v_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, auth.uid(), 'OWNER');

    RETURN v_org_id;
END;
$$;

-- 9. INVITE FLOW RPCs — NOT in the original Prompt 2 plan (see table 5 note).

CREATE OR REPLACE FUNCTION public.get_invite_preview(p_token UUID)
RETURNS TABLE(organization_name TEXT, email TEXT, role TEXT, status TEXT, expires_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
    SELECT o.name, i.email, i.role, i.status, i.expires_at
    FROM public.organization_invites i
    JOIN public.organizations o ON o.id = i.organization_id
    WHERE i.token = p_token;
$$;

CREATE OR REPLACE FUNCTION public.accept_organization_invite(p_token UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite RECORD;
    v_caller_email TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;

    SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();

    SELECT * INTO v_invite
    FROM public.organization_invites
    WHERE token = p_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'invite not found';
    END IF;

    IF v_invite.status <> 'PENDING' THEN
        RAISE EXCEPTION 'invite is no longer pending';
    END IF;

    IF v_invite.expires_at < NOW() THEN
        RAISE EXCEPTION 'invite has expired';
    END IF;

    IF lower(v_invite.email) <> lower(v_caller_email) THEN
        RAISE EXCEPTION 'this invite was sent to a different email address';
    END IF;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_invite.organization_id, auth.uid(), v_invite.role)
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    UPDATE public.organization_invites
    SET status = 'ACCEPTED'
    WHERE id = v_invite.id;

    RETURN v_invite.organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_organization_members(p_org_id UUID)
RETURNS TABLE(user_id UUID, email TEXT, role TEXT)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
    SELECT m.user_id, u.email, m.role
    FROM public.organization_members m
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.organization_id = p_org_id
      AND p_org_id IN (SELECT private.current_org_ids());
$$;

-- 10. WEBHOOK SECRET ROLE GATE — NOT in the original Prompt 2 plan.
CREATE OR REPLACE FUNCTION public.get_org_webhook_secret(p_org_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_secret UUID;
BEGIN
    SELECT role INTO v_role
    FROM public.organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid();

    IF v_role IS NULL OR v_role NOT IN ('OWNER', 'ADMIN') THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT webhook_secret INTO v_secret
    FROM public.organizations
    WHERE id = p_org_id;

    RETURN v_secret;
END;
$$;

-- 11. PRODUCTION DATA ROLE ACCESS PROVISIONING
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_org_ids() TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT, INSERT ON public.organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organization_invites TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_organization_with_owner(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_invite_preview(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_preview(UUID) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.accept_organization_invite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invite(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_organization_members(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_organization_members(UUID) TO authenticated;

-- Added 2026-08-18 (migration 20260818130000_team_management_rpcs.sql).
REVOKE EXECUTE ON FUNCTION public.change_member_role(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_member_role(UUID, UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.remove_organization_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_organization_member(UUID, UUID) TO authenticated;

-- private.caller_role_in_org(UUID) receives NO grant at all — it is called only
-- from inside the two SECURITY DEFINER functions above, which run as their owner.

REVOKE EXECUTE ON FUNCTION public.get_org_webhook_secret(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_webhook_secret(UUID) TO authenticated;

-- NOTE: organization_credentials receives NO grants to anon/authenticated.
-- Access is service_role only, via Server Actions.

-- 12. ROW LEVEL SECURITY (RLS) MULTI-TENANT ISOLATION POLICIES
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own organizations" ON public.organizations
    FOR SELECT USING (id IN (SELECT private.current_org_ids()));

CREATE POLICY "Owners and admins update their organization" ON public.organizations
    FOR UPDATE
    USING (
        id IN (SELECT private.current_org_ids())
        AND EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = organizations.id
              AND user_id = auth.uid()
              AND role IN ('OWNER', 'ADMIN')
        )
    )
    WITH CHECK (
        id IN (SELECT private.current_org_ids())
        AND EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = organizations.id
              AND user_id = auth.uid()
              AND role IN ('OWNER', 'ADMIN')
        )
    );

CREATE POLICY "Members read own membership rows" ON public.organization_members
    FOR SELECT USING (organization_id IN (SELECT private.current_org_ids()));

-- NOTE: organization_members has no authenticated INSERT policy, and as of
-- 2026-08-18 still no UPDATE or DELETE policy either. Membership rows are only
-- ever written by SECURITY DEFINER functions — create_organization_with_owner
-- and accept_organization_invite (INSERT), change_member_role (UPDATE) and
-- remove_organization_member (DELETE) — which bypass RLS by design. There is no
-- direct client-side write path of any kind.
--
-- That is enforced BELOW RLS as well, and it is the stronger half: `authenticated`
-- is granted only SELECT and INSERT on this table (Section 11), so it has no
-- UPDATE or DELETE privilege for a policy to permit in the first place. Adding a
-- policy would therefore not open a client write path without also widening the
-- grant — do neither. Both new RPCs re-resolve the caller's own role for the
-- org id they are passed; see Section 14.

CREATE POLICY "Members read tenant leads" ON public.leads
    FOR SELECT USING (organization_id IN (SELECT private.current_org_ids()));

CREATE POLICY "Members create tenant leads" ON public.leads
    FOR INSERT WITH CHECK (organization_id IN (SELECT private.current_org_ids()));

CREATE POLICY "Members write tenant leads" ON public.leads
    FOR UPDATE
    USING (organization_id IN (SELECT private.current_org_ids()))
    WITH CHECK (organization_id IN (SELECT private.current_org_ids()));

CREATE POLICY "Members read tenant invites" ON public.organization_invites
    FOR SELECT USING (organization_id IN (SELECT private.current_org_ids()));

CREATE POLICY "Owners and admins create tenant invites" ON public.organization_invites
    FOR INSERT
    WITH CHECK (
        organization_id IN (SELECT private.current_org_ids())
        AND EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = organization_invites.organization_id
              AND user_id = auth.uid()
              AND role IN ('OWNER', 'ADMIN')
        )
    );

-- "Revoke" is implemented as an UPDATE (status -> 'REVOKED'), not a DELETE —
-- invite rows are never hard-deleted, consistent with the Resurrection
-- Engine's no-hard-deletes stance elsewhere in this document.
CREATE POLICY "Owners and admins revoke tenant invites" ON public.organization_invites
    FOR UPDATE
    USING (
        organization_id IN (SELECT private.current_org_ids())
        AND EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = organization_invites.organization_id
              AND user_id = auth.uid()
              AND role IN ('OWNER', 'ADMIN')
        )
    )
    WITH CHECK (
        organization_id IN (SELECT private.current_org_ids())
        AND EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = organization_invites.organization_id
              AND user_id = auth.uid()
              AND role IN ('OWNER', 'ADMIN')
        )
    );

-- NOTE: organization_credentials has RLS enabled but intentionally NO
-- policies for anon/authenticated — service_role (which bypasses RLS) is the
-- only path in.

-- 13. PERFORMANCE INDEXES
CREATE INDEX idx_leads_tenant_status ON public.leads(organization_id, status);
CREATE INDEX idx_leads_sla_deadline ON public.leads(organization_id, next_action_at) WHERE archived = FALSE;
CREATE INDEX idx_leads_starred_nodes ON public.leads(organization_id) WHERE is_starred = TRUE;
CREATE INDEX idx_leads_outcome_revenue ON public.leads(organization_id, outcome, closed_at);
-- Added 2026-08-18. Backs both the assigned_to FK (an unindexed FK column makes
-- ON DELETE SET NULL scan the whole table) and the "My leads" filter, which is
-- always organization_id + assigned_to together. Partial for the same reason as
-- idx_leads_starred_nodes: most leads are unassigned.
CREATE INDEX idx_leads_tenant_assignee ON public.leads(organization_id, assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_org_webhook_secret ON public.organizations(webhook_secret);
CREATE UNIQUE INDEX unique_pending_invite_per_org_email
    ON public.organization_invites(organization_id, email)
    WHERE status = 'PENDING';

-- Replaces the original inline `unique_tenant_client_email` table constraint
-- (migration 20260726120000_case_insensitive_email.sql). Plain UNIQUE
-- constraints on TEXT compare case-sensitively, so "Jane@X.com" and
-- "jane@x.com" were previously two distinct leads in the same org — found
-- while building CSV import (Prompt 10 addendum, docs/ADDENDA_LOG.md), which
-- lowercases before this constraint ever sees a value; the webhook and
-- manual lead-creation paths did not. Named with a `_ci` suffix rather than
-- reusing the old name, so it's clear at a glance this is the
-- case-insensitive version. Both orgs' lead data was wiped as part of this
-- migration (0 real leads existed; the 20-lead TEKGUYZ Demo fixture was
-- reseeded afterward) — no backfill/collision logic was needed or written.
CREATE UNIQUE INDEX unique_tenant_client_email_ci
    ON public.leads (organization_id, lower(email));
```

**Migration note (reconciled):** the original note said organization creation "is enforced at the Server Action layer in the Prompt 2 build, not by a database trigger." In the actual build it's neither a bare Server Action insert nor a trigger — it's the `create_organization_with_owner` SECURITY DEFINER function above, atomic within a single Postgres transaction, called by (not implemented inside) the signup/onboarding Server Action. This still satisfies the original constraint — never a bare trigger, the owner membership row can never exist without its organization or vice versa — but the atomicity boundary is a DB function rather than application-level transaction code.

**Prompt 7 addendum (applied via Supabase MCP `apply_migration`, disclosed after the fact):** an `activity_logs` table, its RLS policies, and an index were applied directly to the live database during Prompt 7 — the one exception to the "never call `apply_migration` directly" rule, made before that rule was explicitly stated. Matches `supabase/migrations/20260707215320_activity_logs.sql` on disk exactly. Structure: `id UUID PK`, `lead_id UUID FK -> leads`, `organization_id UUID FK -> organizations`, `log_type TEXT` (constrained to `WEBHOOK`, `MANUAL_NOTE`, `AUDIO_TRANSCRIPT`, `SYSTEM_ALERT`), `content TEXT`, `audio_url TEXT NULL`, `created_at TIMESTAMPTZ`. RLS scoped via `private.current_org_ids()`, same pattern as every other tenant-scoped table. Verify exact column/constraint names against `supabase/migrations/20260707215320_activity_logs.sql` directly if precision matters for a future migration that references this table.

**Task/Calendar addendum (2026-07-28, `supabase/migrations/20260728120000_tasks_table.sql`, applied by the human per the standing DDL rule — not via MCP):** a `tasks` table, lead-scoped, mirroring `leads`' RLS shape exactly (plain `organization_id IN (SELECT private.current_org_ids())`, paired `WITH CHECK` on INSERT/UPDATE, **no role-based `EXISTS` check** — zero role enforcement is deliberate v1 scope, same precedent as `leads` **at the time of writing**). **No longer true of `leads` as of 2026-08-14** — `leads` gained a column-level OWNER/ADMIN gate (see the Leads MEMBER-role enforcement addendum below); `tasks` did not, and its lack of enforcement remains deliberate. Do not read "mirrors `leads`" as current. Re-verified against the live database (not just the migration file) via direct `pg_indexes`/`pg_trigger`/`pg_policies` queries on 2026-07-28 — all match exactly.

```sql
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members select their tasks" ON public.tasks
    FOR SELECT USING (organization_id IN (SELECT private.current_org_ids()));

CREATE POLICY "Tenant members insert their tasks" ON public.tasks
    FOR INSERT WITH CHECK (organization_id IN (SELECT private.current_org_ids()));

CREATE POLICY "Tenant members update their tasks" ON public.tasks
    FOR UPDATE
    USING (organization_id IN (SELECT private.current_org_ids()))
    WITH CHECK (organization_id IN (SELECT private.current_org_ids()));

-- No DELETE policy and no DELETE grant — completion is a state flip
-- (completed = true), not a row removal, matching the Resurrection Engine's
-- no-hard-deletes stance and activity_logs' immutability. Consequence: no
-- role, including OWNER, can delete a task row from the app; only
-- service-role can (used only for this session's own test-fixture cleanup).

CREATE INDEX idx_tasks_org_due ON public.tasks(organization_id, due_at) WHERE completed = FALSE;
CREATE INDEX idx_tasks_lead_id ON public.tasks(lead_id, completed);

CREATE TRIGGER trigger_update_tasks_timestamp
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_modified_timestamp();

GRANT SELECT, INSERT, UPDATE ON public.tasks TO authenticated;
```

Reuses `private.current_org_ids()` and `public.sync_modified_timestamp()` as-is — no new helper function. Full build narrative (step-zero verification, the adversarial cross-tenant RLS test, the Tasks Due agenda query's defense-in-depth `leads!inner` filter, and the archive-side auto-close in Prompt 4) lives in `docs/ADDENDA_LOG.md` under the three "Task/Calendar addendum" sections.

**Leads MEMBER-role enforcement addendum (2026-08-14, `supabase/migrations/20260814120000_leads_member_role_enforcement.sql`, applied by the human per the standing DDL rule and re-verified live the same day via `pg_trigger`/`pg_proc` — trigger present and enabled, function `SECURITY INVOKER` with `search_path` pinned):** a `BEFORE UPDATE` trigger on `public.leads` restricting four columns — `archived`, `outcome`, `actual_revenue`, `closed_at` — to OWNER/ADMIN. The three `leads` policies above are **unchanged**: SELECT and INSERT stay fully open to any tenant member, and the tenant boundary is still the paired `USING`/`WITH CHECK` on "Members write tenant leads". A policy cannot express this rule — `WITH CHECK` evaluates the resulting row, not a column-level diff — so the column-level role gate is a trigger layered on top, following `public.sync_modified_timestamp()`'s precedent. Pre-migration reconciliation on 2026-08-14 confirmed the live `leads` policies, trigger, grants and column types match this file exactly, with no drift.

```sql
CREATE OR REPLACE FUNCTION public.enforce_lead_role_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER            -- authenticated already reads organization_members
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
BEGIN
    -- Unchanged values pass. Load-bearing: updateLead() re-sends all three
    -- close columns on every save, so without this a MEMBER could not edit
    -- any field on an already-closed lead.
    IF new.archived       IS NOT DISTINCT FROM old.archived
   AND new.outcome        IS NOT DISTINCT FROM old.outcome
   AND new.actual_revenue IS NOT DISTINCT FROM old.actual_revenue
   AND new.closed_at      IS NOT DISTINCT FROM old.closed_at THEN
        RETURN new;
    END IF;

    -- Service-role / SQL editor: no end-user identity. Exempt on purpose —
    -- the webhook Resurrection Engine writes `archived` this way. RLS bypass
    -- is NOT trigger bypass, so this exemption has to be explicit.
    IF v_uid IS NULL THEN
        RETURN new;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.organization_id = old.organization_id
          AND m.user_id = v_uid
          AND m.role IN ('OWNER', 'ADMIN')
    ) THEN
        RETURN new;
    END IF;

    -- 42501 = PostgREST HTTP 403. The sentinel prefix is what
    -- src/lib/leads/role-errors.ts matches on; a bare 42501 is ambiguous
    -- because a plain RLS denial uses the same SQLSTATE.
    RAISE EXCEPTION 'LEAD_ROLE_DENIED: only an owner or admin can archive a lead or change its close outcome, revenue, or close date.'
        USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE TRIGGER trigger_enforce_lead_role_restrictions
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_lead_role_restrictions();
```

Enforcement is proven by a live three-role suite, `src/lib/leads/leads-role-enforcement.rls.test.ts`, run with `npm run test:rls` (deliberately excluded from `npm test` — it creates and tears down real auth users). Full narrative: `docs/ADDENDA_LOG.md` § Leads MEMBER-role enforcement addendum.

**Lead assignment membership guard (2026-08-18, `supabase/migrations/20260818120000_leads_assigned_to.sql`, applied by the human per the standing DDL rule — not via MCP).** The second `leads` trigger, and the second rule RLS cannot express. It adds no policy: `assigned_to` rides inside the existing "Members write tenant leads" `USING`/`WITH CHECK` pair, which already scopes by `organization_id`.

```sql
CREATE OR REPLACE FUNCTION public.enforce_lead_assignee_membership()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF new.assigned_to IS NULL THEN RETURN new; END IF;

    IF tg_op = 'UPDATE'
   AND new.assigned_to     IS NOT DISTINCT FROM old.assigned_to
   AND new.organization_id IS NOT DISTINCT FROM old.organization_id THEN
        RETURN new;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.organization_id = new.organization_id
          AND m.user_id = new.assigned_to
    ) THEN RETURN new; END IF;

    RAISE EXCEPTION 'LEAD_ASSIGNEE_NOT_MEMBER: a lead can only be assigned to a member of the organization that owns it.'
        USING ERRCODE = '23514';
END;
$$;

CREATE OR REPLACE TRIGGER trigger_enforce_lead_assignee_membership
    BEFORE INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_lead_assignee_membership();
```

Two deliberate differences from `enforce_lead_role_restrictions` above, both load-bearing. **No `auth.uid() IS NULL` exemption:** that trigger asks "who is calling, and may they do this", which has no answer without an end-user identity; this one asks "is the assignee a member of this org", a fact about the row with the same answer for every caller — so service-role writes (the webhook Resurrection Engine, `import_leads_chunk`, the seed scripts) are checked too. **`ERRCODE 23514`, not `42501`:** a data-integrity violation rather than a permission one, which keeps the two sentinels distinguishable and maps to a 400 rather than a 403.

`SECURITY INVOKER` is safe here for the reason it is safe there: `organization_members`' SELECT policy is `organization_id IN (SELECT private.current_org_ids())`, so a member can already read every member row of their own org. An RLS-restricted read can only return *fewer* rows, which makes the `EXISTS` fail and the write reject — fail-closed, never fail-open.

Proven by `src/lib/leads/leads-assignment.rls.test.ts` (`npm run test:rls`), which builds two disposable orgs because cross-tenant needs a real second tenant, and observes the rejection for OWNER, MEMBER, INSERT, UPDATE and service-role. Full narrative: `docs/ADDENDA_LOG.md` § 2026-08-18 — `leads.assigned_to`: per-lead ownership.

**Team management RPCs (2026-08-18, `supabase/migrations/20260818130000_team_management_rpcs.sql`, applied by the human per the standing DDL rule — not via MCP).** Two `SECURITY DEFINER` functions that give `organization_members` its first UPDATE and DELETE paths. **No RLS policy was added to that table and none should be** — see the note in Section 12: `authenticated` has no UPDATE/DELETE grant, so the RPC-only shape is enforced below RLS.

Both re-resolve the **caller's own** role for the specific `p_org_id` argument, inside the body, through a helper that has no client grant:

```sql
CREATE OR REPLACE FUNCTION private.caller_role_in_org(p_org_id UUID)
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
    SELECT m.role
    FROM public.organization_members m
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid();
$$;
```

Returns NULL when the caller is not a member, so "not in that org" and "a MEMBER of that org" stay distinguishable and a non-member can never be treated as authorised by an accidental NULL comparison. In `private`, not `public`: it is not an API surface.

**Both functions lock before counting.** The last-OWNER rule is a count-then-act invariant, so without a lock two concurrent demotions could each see two OWNERs, each conclude it is safe, and together leave the org with zero — permanently un-administerable, since only an OWNER can grant OWNER.

```sql
PERFORM 1 FROM public.organization_members
 WHERE organization_id = p_org_id FOR UPDATE;
```

An aggregate cannot carry `FOR UPDATE`, hence lock-then-count. Both functions lock the same rows in the same order, so they cannot deadlock against each other.

`public.change_member_role(p_org_id UUID, p_target_user_id UUID, p_new_role TEXT) RETURNS void` rejects, in order: no `auth.uid()` · `p_new_role` not one of the three · caller not OWNER/ADMIN of this org · target not a member of this org · an ADMIN acting on an OWNER · an ADMIN granting OWNER · demoting the last OWNER (self included — the rule is about the org, not about who is asking). A no-op (role unchanged) returns early so it cannot trip the last-OWNER rule.

`public.remove_organization_member(p_org_id UUID, p_target_user_id UUID) RETURNS void` authorises a caller who is OWNER/ADMIN **or is the target themselves** — that second clause is what makes "Leave organization" reachable for a MEMBER, who can manage nobody. The ADMIN-cannot-manage-an-OWNER check is skipped for self-removal (an ADMIN removing themselves is not acting on an owner); the last-OWNER rule is not. It then releases the leaver's assignments and deletes the row, in one transaction:

```sql
UPDATE public.leads
   SET assigned_to = NULL
 WHERE organization_id = p_org_id
   AND assigned_to = p_target_user_id;

DELETE FROM public.organization_members
 WHERE organization_id = p_org_id
   AND user_id = p_target_user_id;
```

There is no FK from `leads.assigned_to` to `organization_members` — it references `auth.users`, whose `ON DELETE SET NULL` fires only when the auth user itself is deleted — so nothing does this automatically. The `UPDATE` touches one column; `updated_at` moves because `trigger_update_leads_timestamp` fires, which is the table's own behaviour. It passes `trigger_enforce_lead_assignee_membership` on the `assigned_to IS NULL` early return and `trigger_enforce_lead_role_restrictions` on its unchanged-columns fast path.

Error sentinels, translated for the user by `src/lib/organizations/team-errors.ts`: `TEAM_NOT_AUTHORIZED`, `TEAM_ADMIN_CANNOT_MANAGE_OWNER`, `TEAM_ADMIN_CANNOT_GRANT_OWNER` (all `42501`), `TEAM_LAST_OWNER`, `TEAM_MEMBER_NOT_FOUND`, `TEAM_INVALID_ROLE` (all `23514`). Authorisation failures use `42501`, invariant failures `23514`, and the two are kept distinct on purpose.

Enforcement is proven by `src/lib/organizations/team-management.rls.test.ts` (`npm run test:rls`, excluded from `npm test`), which builds two disposable orgs and five throwaway users and asserts each rejection's own sentinel rather than only its SQLSTATE — a plain RLS denial and a CHECK constraint reuse both codes. Three tests prove the allowed side, so the gates are specific rather than blanket. Full narrative: `docs/ADDENDA_LOG.md` § 2026-08-18 — Team management: role change and member removal.

**CSV import chunk-write addendum (2026-08-15, `supabase/migrations/20260815120000_import_leads_chunk_rpc.sql`, applied by the human per the standing DDL rule — not via MCP):** adds `public.import_leads_chunk(p_organization_id UUID, p_rows JSONB) RETURNS TABLE(lead_id UUID, lead_email TEXT)`. Adds nothing else — no table, no policy, no index, no trigger. The three `leads` RLS policies and `unique_tenant_client_email_ci` are byte-for-byte unchanged.

**This is the ninth `SECURITY DEFINER` function, and it self-checks.** Running inventory of which of them re-assert authorization inside the body rather than trusting their arguments (a tenth was added on 2026-08-17 — see the last row and the invite-close addendum at the end of this file):

| Function | Self-check inside the body |
| --- | --- |
| `private.current_org_ids()` | n/a — reads `auth.uid()` only, takes no argument to forge |
| `create_organization_with_owner` | ✅ raises on NULL `auth.uid()`; makes the caller the OWNER, never a supplied user id |
| `get_invite_preview` | ❌ none by design — an unauthenticated invitee must be able to read it (only `anon`-callable function in the schema) |
| `accept_organization_invite` | ✅ raises on NULL `auth.uid()`; matches invite email against the caller's own |
| `get_organization_members` | ✅ `p_org_id IN (SELECT private.current_org_ids())` in the WHERE clause |
| `get_org_webhook_secret` | ✅ re-checks the caller's OWNER/ADMIN role for the specific `p_org_id` |
| `vault_set_org_credential` | ✅ internal OWNER/ADMIN role check |
| `vault_clear_org_credential` | ✅ internal OWNER/ADMIN role check |
| `vault_get_org_credential` | ❌ none in the body **by design** — it is gated at the GRANT level instead: `EXECUTE` is revoked from `PUBLIC`/`anon`/`authenticated` and held by `service_role` only, so the caller cannot reach it to need a check. Verified live: the `authenticated` role’s own attempt fails with “permission denied.” Added to this table 2026-08-18 — it had been live and documented in CLAUDE.md § Multi-Tenant Security Model since Prompt 13a but was never listed here. |
| `import_leads_chunk` | ✅ raises on NULL `auth.uid()`; raises unless the caller has an `organization_members` row for `p_organization_id` |
| `close_invite_on_member_insert` (2026-08-17) | n/a — a **trigger** function, not a callable RPC. It takes no arguments to forge, reads only `NEW`, and `EXECUTE` is revoked from `PUBLIC`, so it is unreachable via `/rest/v1/rpc/`. Its tenant scoping is `NEW.organization_id`, which the row being inserted already fixes. |
| `enforce_lead_assignee_membership` (2026-08-18) | n/a — a **trigger** function, and `SECURITY INVOKER` rather than DEFINER, so it is in this table only for completeness. Takes no arguments; scoped by `NEW.organization_id`. |
| `private.caller_role_in_org` (2026-08-18) | n/a — reads `auth.uid()` for the `p_org_id` it is given and returns a role or NULL; it makes no decision. **No grant to any client role at all**, and it lives in `private`, so it is reachable only from the two functions below, which run as their owner. |
| `change_member_role` (2026-08-18) | ✅ raises on NULL `auth.uid()`; re-resolves the caller's own role for `p_org_id` and requires OWNER/ADMIN; then enforces ADMIN-cannot-manage-an-OWNER, ADMIN-cannot-grant-OWNER, and the last-OWNER invariant. Locks the org's membership rows before counting owners, so the invariant is not a race. |
| `remove_organization_member` (2026-08-18) | ✅ raises on NULL `auth.uid()`; requires the caller to be OWNER/ADMIN **or** to be the target (self-removal is the one MEMBER-permitted write); then ADMIN-cannot-remove-an-OWNER and the last-OWNER invariant. Same lock-before-count. Releases the leaver's `leads.assigned_to` in the same transaction as the delete. |

`import_leads_chunk`'s check is **membership, not role** — `leads` INSERT keeps full MEMBER parity by design, so any member of the org may import. `search_path` is pinned to `''` (verified live: `proconfig = {search_path=""}`), `EXECUTE` is revoked from `PUBLIC`/`anon` and granted to `authenticated` only (verified live: `proacl` is `postgres=X | service_role=X | authenticated=X`, with no `anon` entry and no `=X/` PUBLIC grant). Because `SECURITY DEFINER` bypasses RLS, that internal membership check — not the `"Members create tenant leads"` policy — is the tenant boundary on this one path. Proven live: a signed-in member of a different org calling it with TEKGUYZ Demo's `organization_id` gets `IMPORT_NOT_AUTHORIZED: caller is not a member of the requested organization.` and writes zero rows.

Why the function exists at all, and why the OUT columns are named `lead_id`/`lead_email` rather than `id`/`email`: `docs/ADDENDA_LOG.md` § CSV import chunk-write RPC.

```sql
-- Abbreviated; full body with its reasoning comments is in the migration file.
CREATE OR REPLACE FUNCTION public.import_leads_chunk(p_organization_id UUID, p_rows JSONB)
RETURNS TABLE (lead_id UUID, lead_email TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID := (SELECT auth.uid());
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'IMPORT_NOT_AUTHORIZED: authentication required.' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.organization_id = p_organization_id AND m.user_id = v_uid
    ) THEN
        RAISE EXCEPTION 'IMPORT_NOT_AUTHORIZED: caller is not a member of the requested organization.'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    WITH inserted AS (
        INSERT INTO public.leads (organization_id, client_name, email, /* ...9 more... */)
        SELECT p_organization_id, r.client_name, lower(trim(r.email)), /* ... */
        FROM jsonb_to_recordset(p_rows) AS r(client_name TEXT, email TEXT /* ... */)
        ON CONFLICT (organization_id, lower(email)) DO NOTHING   -- inference form: expression index
        RETURNING leads.id, leads.email
    )
    SELECT inserted.id, inserted.email FROM inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.import_leads_chunk(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_leads_chunk(UUID, JSONB) TO authenticated;
```

**`lead_submissions` addendum (2026-08-17, `supabase/migrations/20260817120000_lead_submissions.sql` + `20260817140000_lead_submissions_org_index.sql`, both applied by the human per the standing DDL rule):** the immutable log of every inbound enquiry, one row per enquiry, hanging off `leads` by `lead_id` with `ON DELETE CASCADE`. It exists because `ingestWebhookLead` used to overwrite a lead's identity columns in place on every resubmission; `leads` now stays exactly one row per `(organization_id, lower(email))` contact and everything a given enquiry actually said lives here. It is also the home of `message`, which `leads` has never had. **Append-only, enforced by omission:** only SELECT and INSERT are granted, and only SELECT and INSERT policies exist — RLS denies by default, so the absence of an UPDATE/DELETE policy *is* the enforcement, same stance as `activity_logs`. RLS shape mirrors `leads`/`tasks`: plain `organization_id IN (SELECT private.current_org_ids())`, with the INSERT policy carrying `WITH CHECK` only (there is no `USING` half to pair on, because there is no UPDATE policy). No role-based `EXISTS` check — a submission is strictly less privileged than the lead it hangs off, and `leads` INSERT keeps full MEMBER parity by design.

```sql
CREATE TABLE public.lead_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    -- Denormalized snapshots of what THIS enquiry said: deliberately not FKs
    -- and not generated, so they never change when the leads row changes.
    client_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT DEFAULT NULL,
    company TEXT DEFAULT NULL,
    message TEXT DEFAULT NULL,
    service_category TEXT DEFAULT NULL,
    lead_source TEXT DEFAULT NULL,
    -- NULL is honest: only the webhook path has a raw body. createLead, CSV
    -- import and the demo seed synthesize a submission from their own inputs.
    raw_payload JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_submissions ENABLE ROW LEVEL SECURITY;

-- No UPDATE/DELETE grant at all — immutable by design.
GRANT SELECT, INSERT ON public.lead_submissions TO authenticated;

CREATE POLICY "Members read tenant submissions" ON public.lead_submissions
    FOR SELECT USING (organization_id IN (SELECT private.current_org_ids()));

CREATE POLICY "Members create tenant submissions" ON public.lead_submissions
    FOR INSERT WITH CHECK (organization_id IN (SELECT private.current_org_ids()));

-- Matches the read the profile sheet issues: one lead's submissions, newest first.
CREATE INDEX idx_submissions_chronological ON public.lead_submissions(lead_id, created_at DESC);

-- Second migration: covers the organization_id FK the SELECT policy evaluates
-- on every read. Caught by get_advisors(performance) right after the first
-- migration was applied; every other tenant table already had this shape.
CREATE INDEX idx_submissions_tenant ON public.lead_submissions(organization_id, created_at DESC);
```

Every lead-origin path (webhook, `createLead`, CSV import, demo seed) writes a submission row through `src/lib/submissions/record.ts`. Full build narrative, including the live webhook verification and the identity-overwrite bug that prompted it: `docs/ADDENDA_LOG.md` § 2026-08-16 — Wave decisions, § 2026-08-17 — `lead_submissions`: the immutable enquiry log.

**Invite-close trigger addendum (2026-08-17, `supabase/migrations/20260817150000_close_invite_on_member_insert.sql`, applied by the human per the standing DDL rule — not via MCP; re-verified live the same day via `pg_trigger`/`pg_proc`: trigger present and enabled (`tgenabled = 'O'`), function `SECURITY DEFINER` with `proconfig = {search_path=public}`, and `has_function_privilege('public', …, 'EXECUTE') = false`):** an `AFTER INSERT` trigger on `public.organization_members` that closes any `PENDING` `organization_invites` row matching on `(organization_id, lower(email))`. Adds nothing else — no table, no policy, no index, no grant change. `public.accept_organization_invite` is byte-for-byte unchanged, and so is `unique_pending_invite_per_org_email`.

```sql
CREATE OR REPLACE FUNCTION public.close_invite_on_member_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email text;
BEGIN
    -- organization_members has no email column; auth.users is the only source.
    SELECT u.email INTO v_email FROM auth.users u WHERE u.id = new.user_id;
    IF v_email IS NULL THEN
        RETURN NULL;                        -- phone-only identity: nothing to match
    END IF;

    UPDATE public.organization_invites i
       SET status = 'ACCEPTED'
     WHERE i.organization_id = new.organization_id
       AND lower(i.email) = lower(v_email)
       AND i.status = 'PENDING';

    RETURN NULL;                            -- AFTER trigger: return value ignored
END;
$$;

REVOKE EXECUTE ON FUNCTION public.close_invite_on_member_insert() FROM PUBLIC;

CREATE OR REPLACE TRIGGER trigger_close_invite_on_member_insert
    AFTER INSERT ON public.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION public.close_invite_on_member_insert();
```

**Why `SECURITY DEFINER` here, when `enforce_lead_role_restrictions` is deliberately `SECURITY INVOKER`.** The two triggers want opposite things. That one gates a caller who is already authenticated, so running as the invoker is the point. This one exists precisely for writers that are *not* going through the RPC — a Studio session, a service-role script, a future code path that forgets. `organization_invites`' UPDATE policy requires an OWNER/ADMIN membership row, so a `SECURITY INVOKER` version would silently no-op for exactly the callers it is meant to catch, which is the same invisible-failure class the trigger exists to prevent. `search_path` is pinned to `public`, matching `accept_organization_invite` / `create_organization_with_owner` / `get_org_webhook_secret`; every reference in the body is schema-qualified regardless.

**Three deliberate matching decisions.** (1) `lower()` on both sides, even though `unique_pending_invite_per_org_email` is itself case-**sensitive** (`(organization_id, email) WHERE status = 'PENDING'`, confirmed live). Matching case-insensitively is strictly *broader* than that index, which is what is wanted — it also clears a case-mismatched stranded row, the one the index would otherwise keep blocking forever. Same reasoning as `unique_tenant_client_email_ci` on `leads`. (2) `status = 'PENDING'` only — an `ACCEPTED` or `REVOKED` row is never rewritten. (3) **No expiry filter**: an expired-but-still-`PENDING` row is precisely what occupies the partial unique index, so it must close too. Expired invites nobody accepts are a different problem, already surfaced in the UI, and deliberately not addressed by any cron or sweep.

**The overlap with `accept_organization_invite` is intended, not redundant.** That RPC takes `FOR UPDATE` on the invite row *before* it inserts the membership, so this trigger's `UPDATE` runs in the same transaction against a lock the transaction already holds — no deadlock. The RPC's own subsequent `UPDATE … SET status = 'ACCEPTED'` then re-sets the value the trigger just wrote. Idempotent by construction; do not "fix" it by deleting either half.

Live-verified the same day with a disposable service-role script (deleted afterwards per CLAUDE.md § Test-Data Cleanup), not by reading the schema: 15 checks, all passing, over throwaway orgs and auth users that never touched TEKGUYZ or TEKGUYZ Demo. It reproduces the 2026-07-25 scenario for real — an out-of-band service-role `INSERT` into `organization_members`, never through the RPC, against a `PENDING` invite whose stored address differs in case. The identical script run **before** the migration failed exactly that check, which is what makes the pass meaningful. `npm run test:rls` stayed 15/15. `get_advisors` security was 12 findings before and the same 12 after — `close_invite_on_member_insert` does not appear, because `EXECUTE` is revoked from `PUBLIC`; performance went 13 → 12 (an unrelated `unused_index` on `idx_submissions_tenant` cleared). Full narrative: `docs/ADDENDA_LOG.md` § 2026-08-17 — Closing a stranded PENDING invite on membership insert.

**Note on drift not covered by this reconciliation:** the 2026-07-26 SQL block above and this note are not a complete picture of every table shipped since — `report_sends` (2026-07-22), the `audio-notes` storage bucket (2026-07-22), `vault_clear_org_credential` (2026-07-27), and the `organization_members` notification-preference columns (2026-07-27) are live in the database per their own migration files and addenda, but are not reflected here. Only `tasks` and `lead_submissions` were added to this file, each in scope for the work that shipped alongside it; treat any table not named in this file as **possibly present but undocumented here** — check `supabase/migrations/` directly rather than assuming this file is exhaustive.
