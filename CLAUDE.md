# TEKGUYZ CRM: TECHNICAL ARCHITECTURE & MASTER SCHEMA

## 1. CORE MECHANICS & ARCHITECTURE

### File Bloat Prevention
To keep components highly maintainable under LLM context windows, monolithic files are prohibited. Features like the customer profile view are split cleanly at the same directory level into a layout shell file, a brief component, an immutable timeline viewer, and an isolated note-capture form module.

### UI/UX Design System (Notion High-Voltage)
The interface mimics a document-driven desk in bright daylight: minimalist and structurally restrained. Full source spec: `docs/DESIGN.md` — but its color tokens are superseded by the overridden palette below; every other table (Elevation & Depth, Border Radius Scale, Spacing System, Typography Hierarchy) is followed as written.

- Surfaces are defined strictly by a 1px hairline border and layered shadows built from near-transparent steps. No heavy drop shadows.
- Micro-pills and sticker badges use the decorative multi-color palette (purple, pink, orange, teal, green, sky-blue) strictly for category dots or status badges—never for layout borders or main buttons.
- The "Going Cold" SLA Rule: Leads have a `next_action_at` timestamp. When overdue, their UI card border turns to a gray dashed line and the status badge desaturates to grayscale.

**Color Tokens** (overrides DESIGN.md's colors — light / dark, both implemented via a `.dark` class toggled by next-themes with `defaultTheme="system"`):
- Canvas-Soft (`--canvas-soft`, page floor): `oklch(0.97 0.005 60)` light / `oklch(0.15 0.005 240)` dark
- Canvas-Pure (`--canvas-pure`, card/input surfaces): `oklch(1.00 0.000 00)` light / `oklch(0.19 0.005 240)` dark
- Ink-Main (`--ink-main`, primary text): `oklch(0.12 0.008 60)` light / `oklch(0.98 0.000 00)` dark
- Ink-Muted (`--ink-muted`, secondary/supporting text — our own extrapolation, not in the original override spec, needed since the app already had a two-tier text hierarchy): `oklch(0.50 0.006 60)` light / `oklch(0.65 0.01 240)` dark
- Hairline (`--hairline`, 1px borders): `oklch(0.92 0.004 60)` light / `oklch(0.30 0.006 240)` dark (bumped from an initial 0.24 — against canvas-pure's 0.19 that was only a 5-point lightness gap vs light mode's 8-point gap, so borders on nested surfaces like inputs read as nearly invisible)
- Accent (`--accent`, "High-Voltage Electric Blue" — strictly primary CTAs, active nav links, focus rings, and inline navigational links; never decorative): `oklch(0.42 0.280 264)` light / `oklch(0.55 0.240 264)` dark
- Cold (`--cold`, the "Going Cold" SLA border/badge tone): `oklch(0.70 0.005 60)` light / `oklch(0.45 0.005 240)` dark
- Decorative pill palette (purple/pink/orange/teal/green/sky, each with a `-bg`/`-fg` pair): defined in `src/app/globals.css` for both themes, following the same light-pastel-bg+saturated-fg (light) / dark-saturated-bg+light-tint-fg (dark) pattern — not part of the original override spec, extrapolated to match it.

**Typography:** display headings (h1–h6) use font-weight 700 with `-0.04em` negative tracking, applied globally via `@layer base` in globals.css. Full hierarchy table (display-1/2, heading-1/2/3, title, body-md/sm, button, caption, eyebrow) follows DESIGN.md's Typography > Hierarchy table as written.

**Shapes — Border Radius Scale** (DESIGN.md, overrides Tailwind's stock scale which used different px values under the same utility names): `rounded-xs` 4px (form fields) · `rounded-sm` 5px (menu items, list rows, status pills) · `rounded-md` 8px (utility/nav buttons, smaller cards) · `rounded-lg` 12px (feature cards, modals) · `rounded-xl` 16px (large containers) · `rounded-full` 9999px (pills, badges, circular icons — Tailwind's stock value already matched, no override needed).

**Elevation & Depth** (DESIGN.md): Level 0 flat (hairline only, no shadow) is the default for most cards. Level 1 "Soft" (`--shadow-elevation-1`) is a 4-stop near-transparent stack for raised elements (buttons, default card shadow, and the focus state on inputs/selects/textareas). Level 2 "Elevated" (`--shadow-elevation-2`) is a deeper 5-stop stack for modals/popovers — DESIGN.md only documents the final stop of Level 2 (`0 23px 52px / .05`); the other 4 stops are our own geometric interpolation. The alpha values differ by theme (defined per-theme in `:root`/`.dark`, not in `@theme` directly) — DESIGN.md gives no dark-mode shadow ramp, and reusing the light-mode alphas verbatim left shadows nearly imperceptible against the dark canvas (black-on-near-black is far weaker than black-on-white at the same alpha), so dark mode uses roughly triple the alpha at each stop to register at all.

**Focus state:** DESIGN.md's `text-input` spec calls for "the soft Level-1 shadow" on focus, and lists Notion Blue as the focus-signal color alongside CTAs/links — implemented as one global rule in `@layer base` (`input:not([type="checkbox"], [type="radio"]):focus, select:focus, textarea:focus`) setting `border-color: var(--accent)` and `box-shadow: var(--shadow-elevation-1)`. Note: a single `:not()` with a comma-separated selector list is required — chaining multiple separate `:not()` calls (`:not(a):not(b)`) silently failed to compile under this project's Lightning CSS/Turbopack pipeline.

**Spacing System** (DESIGN.md): base 4px/8px grid, same scale as Tailwind's defaults. `button-utility` padding is `4px 14px` (`px-3.5 py-1`); `text-input` padding is `6px` all sides (`p-1.5`); card interior padding is `24px` (`p-6`).

### High-Leverage Operational Utilities
- **Click-to-Action Real-Time Shortcuts:** Every phone number dynamically renders with `tel:` and `sms:` protocols. Every email compiles a `mailto:` redirect wrapper, and physical addresses point directly to Google Maps URL parameters for single-tap field execution.
- **Resurrection Engine:** No hard deletions are permitted; deletions toggle the `archived` boolean flag. If an archived client submits an inbound webhook form, the system resurrects the profile, shifts its status to NEW, and flags it with a `[Returned Prospect]` UI indicator.
- **Kanban Reorder Rule:** Same-column drag does NOT persist a manual order; column order stays driven by existing field logic (SLA date / revenue / starred). Only cross-column drag persists, and only changes `status`.
- **Contacts Directory Scope:** The Contacts directory shows all non-archived leads regardless of `outcome` (WON/LOST/ABANDONED all remain visible) — deliberately different from Pipeline views, which filter to active work only. `archived` is the only visibility lever for Contacts; `outcome` is never used to hide a contact. Reasoning: WON leads become paying clients and need to stay reachable; LOST/ABANDONED may get re-engaged later; a directory's job is different from a pipeline's job. If clutter becomes a real problem, the fix is better search (Prompt 8's command palette), not blanket suppression of real data.

### Multi-Tenant Security Model
Following a Principal Architect audit of the original schema, five structural gaps were identified and closed. These are now permanent architectural law, not optional hardening:

1. **Membership-based tenant resolution.** A user's access to an organization is never assumed or hardcoded — it's resolved through an `organization_members` table (user_id ↔ organization_id ↔ role). RLS policies call a `SECURITY DEFINER` helper, `private.current_org_ids()`, rather than referencing a literal UUID or tautological condition. (Lives in a dedicated `private` schema, never added to the API-exposed schema list, rather than `auth` — hosted Supabase does not allow creating objects in the `auth` schema itself.)
2. **RLS with paired `WITH CHECK` clauses.** Every write policy validates both the row being touched (`USING`) and the row being written (`WITH CHECK`), preventing a request from reassigning a row into a different tenant's scope.
3. **Vaulted credentials, service-role only.** BYO LLM/integration keys and tokens live in a dedicated `organization_credentials` table, encrypted via Supabase Vault (pgsodium), with `anon` and `authenticated` grants fully revoked. Decryption happens only inside Server Actions at the moment of use.
4. **Per-tenant webhook secret.** `organizations.webhook_secret` is a unique, server-generated, rotatable token that resolves inbound webhook traffic to the correct tenant. The ingestion route is tenant-scoped by this secret, never by a payload-supplied `organization_id`.
5. **Explicit revenue/outcome tracking.** `leads` carries `outcome` (WON / LOST / ABANDONED), `closed_at`, and `actual_revenue`, so the analytics cron can distinguish realized revenue from abandoned or lost pipeline — rather than inferring outcome from the `archived` flag alone.

**Role enforcement status** (`organization_members.role`: OWNER/ADMIN/MEMBER) — partial, kept accurate here so it doesn't get assumed complete: enforced at RLS for `organization_invites` (create/revoke, OWNER/ADMIN only), the `organizations` UPDATE policy (OWNER/ADMIN only), and the `get_org_webhook_secret` RPC (OWNER/ADMIN only, re-checks the caller's own role for the specific `org_id` requested — never trusts a client-supplied `org_id` alone). **NOT enforced anywhere on `leads`** — any member has full CRUD parity regardless of role. Sensitive per-row data (`webhook_secret`, invite tokens) is gated at the fetch level, not just conditionally rendered — a value that never should reach a MEMBER is never queried for one, since anything passed as a prop to a client component ships in the RSC payload regardless of whether it's visually rendered.

---

## 2. PREMIUM MULTI-TENANT POSTGRESQL SCHEMA

This section is the live schema, reconciled directly against the Supabase project — not a snapshot of the original Prompt 2 plan. Table/column existence and RPC signatures below were confirmed against the project's live PostgREST OpenAPI root (`/rest/v1/`); full DDL (policies, function bodies, indexes, constraints — none of which PostgREST introspection exposes) comes from the migration files actually applied, in `supabase/migrations/`. No direct Postgres/pg_catalog access (no Supabase CLI, no DB connection string) was available at the time of this reconciliation, so this was as close to "dump the live database" as achievable without one — if a policy or function was ever hand-edited via the dashboard SQL Editor outside a migration file, this block would not catch that drift. **Note: an `activity_logs` migration (table, RLS, index) was applied directly via Supabase MCP during Prompt 7, after this reconciliation — see the Prompt 7 addendum below the SQL block.**

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgsodium";

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

-- 3. ORGANIZATION CREDENTIALS TABLE (unchanged — Vaulted BYO Keys, service_role only)
CREATE TABLE public.organization_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
    api_key_gemini TEXT DEFAULT NULL,
    api_key_openai TEXT DEFAULT NULL,
    api_key_anthropic TEXT DEFAULT NULL,
    token_resend TEXT DEFAULT NULL,
    token_twilio TEXT DEFAULT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- NOTE: values encrypted at rest via Supabase Vault / pgsodium.
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
    CONSTRAINT check_valid_outcome CHECK (outcome IS NULL OR outcome IN ('WON', 'LOST', 'ABANDONED')),
    CONSTRAINT unique_tenant_client_email UNIQUE (organization_id, email)
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
```

**Migration note (reconciled):** the original note said organization creation "is enforced at the Server Action layer in the Prompt 2 build, not by a database trigger." In the actual build it's neither a bare Server Action insert nor a trigger — it's the `create_organization_with_owner` SECURITY DEFINER function above, atomic within a single Postgres transaction, called by (not implemented inside) the signup/onboarding Server Action. This still satisfies the original constraint — never a bare trigger, the owner membership row can never exist without its organization or vice versa — but the atomicity boundary is a DB function rather than application-level transaction code.

**Prompt 7 addendum (applied via Supabase MCP `apply_migration`, disclosed after the fact):** an `activity_logs` table, its RLS policies, and an index were applied directly to the live database during Prompt 7 — the one exception to the "never call `apply_migration` directly" rule, made before that rule was explicitly stated. Matches `supabase/migrations/20260707215320_activity_logs.sql` on disk exactly. Structure: `id UUID PK`, `lead_id UUID FK -> leads`, `organization_id UUID FK -> organizations`, `log_type TEXT` (constrained to `WEBHOOK`, `MANUAL_NOTE`, `AUDIO_TRANSCRIPT`, `SYSTEM_ALERT`), `content TEXT`, `audio_url TEXT NULL`, `created_at TIMESTAMPTZ`. RLS scoped via `private.current_org_ids()`, same pattern as every other tenant-scoped table. Verify exact column/constraint names against `supabase/migrations/20260707215320_activity_logs.sql` directly if precision matters for a future migration that references this table.

---

## 3. 15-PHASE TECHNICAL ROADMAP

**Phase 1: SaaS Omni-Shell Navigation Layout & Database Security**
- Prompt 1: Initialize the complete multi-tenant platform App Shell layout tracking a fixed vertical left navigation sidebar, a dedicated sidebar footer Quick-Action button container, and a top horizontal utility header bar using pure Tailwind v4 OKLCH theme tokens.
- Prompt 2: Execute the full multi-tenant Postgres database schema migration script, including membership-based tenant resolution, vaulted service-role-only credentials, per-tenant webhook secrets, revenue/outcome tracking, and RLS policies with paired WITH CHECK clauses.

**Phase 2: Action Dashboard & Responsive Pipeline Workspace**
- Prompt 3: Implement the complete "Today's Agenda" core focal sub-view layout components, splitting data sections into an SLA Critical queue, a high-value priority track, and a starred account bookmark workspace.
- Prompt 4: Construct the desktop multi-column Kanban board and its drag/reorder state controller, using responsive Tailwind layout tokens.
- Prompt 5: Construct the mobile-first prioritized Focus List, sharing its data adapter with the Kanban board from Prompt 4.
- Prompt 6: Create the document-style "All Contacts" directory card grid layout, mapping every address, phone, and email variable to immediate interactive communication link shortcuts (tel:, sms:, mailto:, Google Maps URL deep links).

**Phase 3: Decoupled Sheets, Search Palettes & Onboarding Wizards**
- Prompt 7: Build out the interactive motion/react customer slide-over profile sheet, decoupling layout states into a separate layout shell component, a markdown executive brief module, and an activity log history stream.
- Prompt 8: Implement the global keyboard-intercepted CMD+K Command Bar overlay portal, establishing rapid fuzzy search capabilities across tenant contact rows to trigger profile sheets.
- Prompt 9: Build the CSV Import/Export Migration Wizard's upload and column-mapping UI using PapaParse.
- Prompt 10: Build the CSV wizard's Zod validation layer and optimized database batch-insert Server Action.

**Phase 4: Inbound Verification Webhooks & Multi-LLM Actions**
- Prompt 11: Construct the hardened, secret-gated `/api/v1/triage/[webhook_secret]` POST ingestion route, configuring rate limiting, a strict Zod schema check, and tenant resolution via the per-organization webhook secret.
- Prompt 12: Layer in the automated `gemini-3.5-flash` AI Spam Shield text verification pass and dispatch deep-linked Resend notification emails on verified inbound leads.
- Prompt 13: Create the multi-tenant BYO API Key configuration form interface (writing to the vaulted `organization_credentials` table via Server Action) alongside the combined note-capture component with browser audio recording mechanics and optimistic "Transcribing…" UI, verifying credential presence before invoking `gemini-3.1-flash-lite` voice transcriptions.

**Phase 5: Analytical Operations & Production Hardening**
- Prompt 14: Engineer an asynchronous serverless cron route utilizing `gemini-3.1-pro` to sweep active lead logs, aggregate projected-vs-realized monthly revenue metrics (using the outcome/actual_revenue fields), and compile a weekly markdown executive diagnostic report delivered via Resend.
- Prompt 15: Perform a complete app-wide optimization pass to deploy global React error boundary components, mount skeleton loading fallbacks, and verify environment variable states for live production delivery on Vercel.

---

## Prompt 11 addendum (Hardened Webhook Ingestion Route)
Built the public `/api/v1/triage/[webhook_secret]` POST route per the Phase 4 spec: `lib/supabase/service-role.ts`, `lib/webhooks/resolve-tenant.ts`, `lib/webhooks/rate-limit.ts`, `lib/webhooks/ingest-lead.ts`, `lib/validation/webhook-payload-schema.ts`, and the thin route handler itself (paths are `src/lib/...` and `src/app/api/...` — this repo's actual code root is `src/`, not the bare `lib/`/`app/` paths the prompt text used). All live-tested end to end against the real Supabase project (new-lead creation, non-archived resubmission as upsert, archived resubmission as resurrection with a `SYSTEM_ALERT` log, Zod 400s, malformed-secret 404, and the 30/min rate limit tripping a 429 with `Retry-After`) — test fixtures were created and then hard-deleted afterward via a throwaway script using the app's own service-role key, never via Supabase MCP.

- **Two service-role clients now exist, deliberately separate.** `src/lib/supabase/admin.ts` was already present (unused, pre-staged — almost certainly for Prompt 13's credentials-vault Server Action) before this prompt started; it has no import restriction. `src/lib/supabase/service-role.ts` is new and is the one actually scoped to `lib/webhooks/*` per this prompt's isolation requirement. Do not merge these into one client — they exist to bound two different elevated-access surfaces separately. If Prompt 13 needs elevated access, it should use `admin.ts`, not `service-role.ts`.
- **Fixed a middleware bug that would have completely broken this route.** `src/lib/supabase/middleware.ts` redirected *any* unauthenticated request to `/login`, with no carve-out for `/api/*` — meaning the "public, unauthenticated" webhook endpoint would have 307'd to a login page instead of ever reaching the route handler. Added an `isApiRoute` (`path.startsWith("/api/")`) bypass alongside the existing `isAuthRoute` check. This is now the standing pattern: API routes own their own auth (secret-gated, cron-secret-gated, etc.) and are never subject to the cookie-session redirect that page routes use.
- **`zod` added as a dependency** — it wasn't in `package.json` before this prompt despite being referenced by the roadmap for the CSV wizard (Prompts 9–10); this is the first prompt to actually install and use it.
- **Refined the "read-only MCP tools" rule from Session & Verification Discipline:** `execute_sql` was used *only* for SELECT statements throughout this prompt's verification, even though nothing in the stated rule technically forbids DML writes through it — test fixture writes/deletes went through a disposable local script using the app's own `SUPABASE_SECRET_KEY` (i.e., the exact code path the app itself uses) instead. Treat `execute_sql` as SELECT-only in practice, not just for schema DDL.

## Build discipline
Build one phase at a time. After each phase, STOP — run the dev server, apply that phase's migration to the real Supabase project, and manually verify it works before starting the next phase. Never generate more than one phase ahead of what's been verified.

## Session & Verification Discipline
- **Never assume a prior instruction landed without checking actual code/file state.** A past conversation, a memory, or a claim in chat is not evidence that code exists — read the file. If asked to confirm behavior, show the real current code/output, not a recollection of intent.
- **Maintain the Known Gaps section for anything intentionally deferred.** If a limitation, missing enforcement, or scoped-out edge case is accepted on purpose (not just forgotten), it gets a bullet there so it doesn't silently get assumed complete in a later session.
- **Build the current unit in isolation unless the roadmap already documents a shared requirement.** When a feature's design could anticipate a future consumer, default to building the current piece standalone. Only build shared infrastructure ahead of time when this file's own roadmap text already explicitly calls for the sharing (e.g. Prompt 5 explicitly says it shares its data adapter with Prompt 4's Kanban board — that's a documented requirement, not an inference). Anticipating unstated future needs is scope creep; following a requirement already written down here is not.
- **`preview_click` can silently no-op on state-changing buttons while still reporting success.** Any such result needs a network/DOM cross-check before being trusted; `button.click()` via `preview_eval` is the reliable fallback. This is a standing verification habit, not a one-time observation.
- **Update CLAUDE.md proactively, without being asked,** whenever a durable architectural decision, a newly-discovered constraint, a scope decision, or a permanent verification habit is established during a session — not just when explicitly instructed to. If genuinely unsure whether something is "durable enough" to warrant an entry, default to logging it rather than omitting it; a stale-but-present entry is easier to prune later than a decision that only ever existed in a chat that got cleared.
- **Supabase MCP tool-access rule:** read-only MCP tools (`list_tables`, `get_advisors`, `execute_sql` for SELECT-only queries) may be used freely for self-verification. Anything that writes schema (`apply_migration`, any DDL) must never be called directly — write the migration SQL file and hand it to the human to apply themselves. (One exception occurred and was disclosed — see the Prompt 7 addendum in section 2 — before this rule was explicitly stated; it stands going forward without exception.)

## Known Gaps
- **`leads` CRUD has zero role enforcement.** Any MEMBER has full read/write/create parity with OWNER/ADMIN — fine today since invited members are trusted collaborators, but re-check before relying on the assumption that a MEMBER has *limited* lead access (e.g. before building any workflow that invites someone who shouldn't see/edit all leads). See "Role enforcement status" under Multi-Tenant Security Model for what IS enforced (invites, org settings, webhook secret).
- **Mobile AppShell/Sidebar has no responsive collapse.** `Sidebar.tsx` is a fixed 240px column with no off-canvas/drawer variant below `lg`; `Header.tsx` has no truncation handling for the org name or search control. At 375px, the org name wraps into 3 cramped lines and the search button overlaps the edge — a real degraded experience, not just cosmetic, though nothing is unreachable (nav links and Focus List cards all remain functional). Estimated fix: half a day, touches `AppShell.tsx` (needs a client-side open/close state wrapper), `Sidebar.tsx` (off-canvas drawer + backdrop + a11y: focus trap, Escape-to-close, body scroll lock, `aria-expanded`), and `Header.tsx` (hamburger trigger + truncation), plus re-verification across all pages in both themes since AppShell is global. **Trigger to actually fix this:** before any client-facing mobile demo, or before Focus List becomes the primary mobile view in production — not before then.
- **Command palette (Prompt 8) does a full client-side fetch + fuse.js fuzzy match with no pagination or debounce.** Deliberate scaling tradeoff for the current contact volume — worth revisiting if a real organization's contact count grows large enough that this becomes slow or bandwidth-heavy.