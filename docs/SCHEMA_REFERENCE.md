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

-- NOTE: organization_members has no authenticated INSERT policy. Membership
-- rows are only ever written by the SECURITY DEFINER functions above
-- (create_organization_with_owner, accept_organization_invite), which bypass
-- RLS by design — there is no direct client-side insert path.

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

**Task/Calendar addendum (2026-07-28, `supabase/migrations/20260728120000_tasks_table.sql`, applied by the human per the standing DDL rule — not via MCP):** a `tasks` table, lead-scoped, mirroring `leads`' RLS shape exactly (plain `organization_id IN (SELECT private.current_org_ids())`, paired `WITH CHECK` on INSERT/UPDATE, **no role-based `EXISTS` check** — zero role enforcement is deliberate v1 scope, same precedent as `leads`). Re-verified against the live database (not just the migration file) via direct `pg_indexes`/`pg_trigger`/`pg_policies` queries on 2026-07-28 — all match exactly.

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

**Note on drift not covered by this reconciliation:** the 2026-07-26 SQL block above and this note are not a complete picture of every table shipped since — `report_sends` (2026-07-22), the `audio-notes` storage bucket (2026-07-22), `vault_clear_org_credential` (2026-07-27), and the `organization_members` notification-preference columns (2026-07-27) are live in the database per their own migration files and addenda, but are not reflected here. Only `tasks` was added to this file, in scope for the work that just shipped; treat any table not named in this file as **possibly present but undocumented here** — check `supabase/migrations/` directly rather than assuming this file is exhaustive.
