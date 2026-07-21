-- The Phase 1 master schema grants UPDATE on organizations to authenticated
-- but never adds a matching RLS policy, so updates were silently blocked by
-- RLS regardless of the grant. Needed now for the org settings UI
-- (name/timezone/currency_format) — scoped to OWNER/ADMIN, same pattern used
-- for organization_invites. webhook_secret is intentionally not editable
-- through this policy or any app code; it's read-only display + copy.

create policy "Owners and admins update their organization" on public.organizations
    for update
    using (
        id in (select private.current_org_ids())
        and exists (
            select 1 from public.organization_members
            where organization_id = organizations.id
              and user_id = auth.uid()
              and role in ('OWNER', 'ADMIN')
        )
    )
    with check (
        id in (select private.current_org_ids())
        and exists (
            select 1 from public.organization_members
            where organization_id = organizations.id
              and user_id = auth.uid()
              and role in ('OWNER', 'ADMIN')
        )
    );
