-- Team invite flow (not part of the numbered 15-prompt roadmap, but necessary
-- product infrastructure — organizations were otherwise permanently single-user).
--
-- No Resend integration exists yet (that's Phase 4), so this does NOT send
-- email. Creating an invite just generates a token; the inviter copies the
-- accept-link and shares it themselves until automated email exists.

create table public.organization_invites (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    email text not null,
    role text not null default 'MEMBER',
    invited_by uuid not null references auth.users(id) on delete cascade,
    token uuid not null default gen_random_uuid() unique,
    status text not null default 'PENDING',
    created_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '7 days'),
    constraint check_valid_invite_role check (role in ('ADMIN', 'MEMBER')),
    constraint check_valid_invite_status check (status in ('PENDING', 'ACCEPTED', 'REVOKED'))
);

-- Only one pending invite per (org, email) at a time.
create unique index unique_pending_invite_per_org_email
    on public.organization_invites(organization_id, email)
    where status = 'PENDING';

alter table public.organization_invites enable row level security;

grant select, insert, update on public.organization_invites to authenticated;

create policy "Members read tenant invites" on public.organization_invites
    for select using (organization_id in (select private.current_org_ids()));

create policy "Owners and admins create tenant invites" on public.organization_invites
    for insert
    with check (
        organization_id in (select private.current_org_ids())
        and exists (
            select 1 from public.organization_members
            where organization_id = organization_invites.organization_id
              and user_id = auth.uid()
              and role in ('OWNER', 'ADMIN')
        )
    );

create policy "Owners and admins revoke tenant invites" on public.organization_invites
    for update
    using (
        organization_id in (select private.current_org_ids())
        and exists (
            select 1 from public.organization_members
            where organization_id = organization_invites.organization_id
              and user_id = auth.uid()
              and role in ('OWNER', 'ADMIN')
        )
    )
    with check (
        organization_id in (select private.current_org_ids())
        and exists (
            select 1 from public.organization_members
            where organization_id = organization_invites.organization_id
              and user_id = auth.uid()
              and role in ('OWNER', 'ADMIN')
        )
    );

-- Anonymous-safe preview: lets the invite acceptance page show "join <Org>"
-- before the visitor has signed in, without exposing anything beyond what
-- the token itself already grants access to.
create or replace function public.get_invite_preview(p_token uuid)
returns table(organization_name text, email text, role text, status text, expires_at timestamptz)
language sql security definer stable
set search_path = public
as $$
    select o.name, i.email, i.role, i.status, i.expires_at
    from public.organization_invites i
    join public.organizations o on o.id = i.organization_id
    where i.token = p_token;
$$;

revoke execute on function public.get_invite_preview(uuid) from public;
grant execute on function public.get_invite_preview(uuid) to anon, authenticated;

-- Atomic accept: validates the token against the CALLING user's own email
-- (never a client-supplied identity), then inserts the membership row and
-- marks the invite accepted in one transaction.
create or replace function public.accept_organization_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_invite record;
    v_caller_email text;
begin
    if auth.uid() is null then
        raise exception 'authentication required';
    end if;

    select email into v_caller_email from auth.users where id = auth.uid();

    select * into v_invite
    from public.organization_invites
    where token = p_token
    for update;

    if not found then
        raise exception 'invite not found';
    end if;

    if v_invite.status <> 'PENDING' then
        raise exception 'invite is no longer pending';
    end if;

    if v_invite.expires_at < now() then
        raise exception 'invite has expired';
    end if;

    if lower(v_invite.email) <> lower(v_caller_email) then
        raise exception 'this invite was sent to a different email address';
    end if;

    insert into public.organization_members (organization_id, user_id, role)
    values (v_invite.organization_id, auth.uid(), v_invite.role)
    on conflict (organization_id, user_id) do nothing;

    update public.organization_invites
    set status = 'ACCEPTED'
    where id = v_invite.id;

    return v_invite.organization_id;
end;
$$;

revoke execute on function public.accept_organization_invite(uuid) from public;
grant execute on function public.accept_organization_invite(uuid) to authenticated;

-- Client SDKs can't read auth.users directly (no grants, and RLS there is
-- Supabase-managed) — this exposes just enough (email + role) to render a
-- team roster, scoped to orgs the caller already belongs to.
create or replace function public.get_organization_members(p_org_id uuid)
returns table(user_id uuid, email text, role text)
language sql security definer stable
set search_path = public
as $$
    select m.user_id, u.email, m.role
    from public.organization_members m
    join auth.users u on u.id = m.user_id
    where m.organization_id = p_org_id
      and p_org_id in (select private.current_org_ids());
$$;

revoke execute on function public.get_organization_members(uuid) from public;
grant execute on function public.get_organization_members(uuid) to authenticated;
