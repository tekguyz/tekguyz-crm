-- Adds per-member notification preference columns to organization_members,
-- so getOwnerAdminRecipients (src/lib/email/recipients.ts) can exclude a
-- member who has opted out of new-lead or weekly-report emails, instead of
-- unconditionally emailing every OWNER/ADMIN.
--
-- Write path is deliberately narrower than a plain UPDATE grant.
-- organization_members has zero existing UPDATE grant or policy at all
-- today (Phase 1 only ever granted SELECT/INSERT, and membership rows are
-- otherwise written exclusively by SECURITY DEFINER functions) — the
-- easy-looking `grant update on organization_members to authenticated` would
-- let a member's own UPDATE also touch `role` (self-promotion to
-- OWNER/ADMIN) or `organization_id` (moving their own row into a different
-- tenant), since RLS's USING/WITH CHECK constrain *which rows* a statement
-- can touch, not *which columns* within an allowed row. Postgres enforces
-- column-level UPDATE privileges independently of RLS, so the column-scoped
-- GRANT below is the actual boundary preventing that, not just the RLS
-- policy alone.

alter table public.organization_members
    add column notify_new_lead boolean not null default true,
    add column notify_weekly_report boolean not null default true;

grant update (notify_new_lead, notify_weekly_report) on public.organization_members to authenticated;

create policy "Members update their own notification preferences" on public.organization_members
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
