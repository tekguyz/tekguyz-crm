-- Phase 2 prerequisite: organization + owner creation, invoked from the
-- signup/onboarding Server Action. No authenticated INSERT policy exists on
-- organizations or organization_members (per the Phase 1 migration note), so
-- this SECURITY DEFINER function is the only path a client can use to create
-- a new tenant — and it can only ever make the calling user the OWNER of a
-- brand-new org, never touch an existing one, since it reads auth.uid()
-- itself rather than accepting a caller-supplied user id.

create or replace function public.create_organization_with_owner(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_org_id uuid;
begin
    if auth.uid() is null then
        raise exception 'authentication required';
    end if;

    insert into public.organizations (name)
    values (p_name)
    returning id into v_org_id;

    insert into public.organization_members (organization_id, user_id, role)
    values (v_org_id, auth.uid(), 'OWNER');

    return v_org_id;
end;
$$;

revoke execute on function public.create_organization_with_owner(text) from public;
grant execute on function public.create_organization_with_owner(text) to authenticated;
