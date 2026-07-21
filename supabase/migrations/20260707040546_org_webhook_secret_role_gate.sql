-- organizations SELECT RLS is membership-based only, with no role
-- distinction — every member's page load (via getCurrentOrg()) was fetching
-- webhook_secret regardless of role, which then ships in the RSC payload
-- even if the UI only rendered an edit form for OWNER/ADMIN. Hiding it in
-- the UI alone doesn't stop that leak. This RPC is the real boundary: it
-- checks the CALLER's own role for the specific org_id requested (not just
-- "is this any valid org"), so a member of a different org, or a plain
-- MEMBER of this org, gets rejected rather than handed the secret.

create or replace function public.get_org_webhook_secret(p_org_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_role text;
    v_secret uuid;
begin
    select role into v_role
    from public.organization_members
    where organization_id = p_org_id
      and user_id = auth.uid();

    if v_role is null or v_role not in ('OWNER', 'ADMIN') then
        raise exception 'not authorized';
    end if;

    select webhook_secret into v_secret
    from public.organizations
    where id = p_org_id;

    return v_secret;
end;
$$;

revoke execute on function public.get_org_webhook_secret(uuid) from public;
grant execute on function public.get_org_webhook_secret(uuid) to authenticated;
