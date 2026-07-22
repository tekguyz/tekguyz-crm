-- Prompt 13a: replace organization_credentials' plaintext TEXT columns with
-- Supabase Vault-encrypted storage. The table has zero rows written so far
-- (confirmed directly against the live table before writing this migration),
-- so this is a clean column swap rather than a data-preserving migration.
--
-- vault.create_secret / vault.update_secret / vault.decrypted_secrets are not
-- exposed via PostgREST, so two SECURITY DEFINER wrapper functions in the
-- public schema do the Vault interaction and are called via .rpc() — same
-- pattern as get_org_webhook_secret (20260707040546): explicit field
-- allowlist via IF/ELSIF branches, never dynamic SQL, and the caller's own
-- role is re-checked inside the function rather than trusted from the client.

create extension if not exists "supabase_vault";

alter table public.organization_credentials
    drop column api_key_gemini,
    drop column api_key_openai,
    drop column api_key_anthropic,
    drop column token_resend,
    drop column token_twilio;

alter table public.organization_credentials
    add column api_key_gemini_secret_id uuid references vault.secrets(id),
    add column api_key_openai_secret_id uuid references vault.secrets(id),
    add column api_key_anthropic_secret_id uuid references vault.secrets(id),
    add column token_resend_secret_id uuid references vault.secrets(id),
    add column token_twilio_secret_id uuid references vault.secrets(id);

-- Writes/rotates one field's secret for an org. This is the entire
-- authorization boundary for the write path: organization_credentials has no
-- RLS policies at all, so nothing else stops a MEMBER from calling this
-- directly (it's a callable RPC endpoint once granted to authenticated) if
-- this role check weren't here.
create or replace function public.vault_set_org_credential(p_org_id uuid, p_field text, p_value text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_role text;
    v_existing_id uuid;
    v_new_id uuid;
begin
    select role into v_role
    from public.organization_members
    where organization_id = p_org_id
      and user_id = auth.uid();

    if v_role is null or v_role not in ('OWNER', 'ADMIN') then
        raise exception 'not authorized';
    end if;

    if p_field not in (
        'api_key_gemini', 'api_key_openai', 'api_key_anthropic',
        'token_resend', 'token_twilio'
    ) then
        raise exception 'invalid credential field: %', p_field;
    end if;

    insert into public.organization_credentials (organization_id)
    values (p_org_id)
    on conflict (organization_id) do nothing;

    if p_field = 'api_key_gemini' then
        select api_key_gemini_secret_id into v_existing_id
        from public.organization_credentials where organization_id = p_org_id;

        if v_existing_id is not null then
            perform vault.update_secret(v_existing_id, p_value);
        else
            v_new_id := vault.create_secret(p_value, p_org_id::text || ':api_key_gemini');
            update public.organization_credentials
            set api_key_gemini_secret_id = v_new_id
            where organization_id = p_org_id;
        end if;

    elsif p_field = 'api_key_openai' then
        select api_key_openai_secret_id into v_existing_id
        from public.organization_credentials where organization_id = p_org_id;

        if v_existing_id is not null then
            perform vault.update_secret(v_existing_id, p_value);
        else
            v_new_id := vault.create_secret(p_value, p_org_id::text || ':api_key_openai');
            update public.organization_credentials
            set api_key_openai_secret_id = v_new_id
            where organization_id = p_org_id;
        end if;

    elsif p_field = 'api_key_anthropic' then
        select api_key_anthropic_secret_id into v_existing_id
        from public.organization_credentials where organization_id = p_org_id;

        if v_existing_id is not null then
            perform vault.update_secret(v_existing_id, p_value);
        else
            v_new_id := vault.create_secret(p_value, p_org_id::text || ':api_key_anthropic');
            update public.organization_credentials
            set api_key_anthropic_secret_id = v_new_id
            where organization_id = p_org_id;
        end if;

    elsif p_field = 'token_resend' then
        select token_resend_secret_id into v_existing_id
        from public.organization_credentials where organization_id = p_org_id;

        if v_existing_id is not null then
            perform vault.update_secret(v_existing_id, p_value);
        else
            v_new_id := vault.create_secret(p_value, p_org_id::text || ':token_resend');
            update public.organization_credentials
            set token_resend_secret_id = v_new_id
            where organization_id = p_org_id;
        end if;

    elsif p_field = 'token_twilio' then
        select token_twilio_secret_id into v_existing_id
        from public.organization_credentials where organization_id = p_org_id;

        if v_existing_id is not null then
            perform vault.update_secret(v_existing_id, p_value);
        else
            v_new_id := vault.create_secret(p_value, p_org_id::text || ':token_twilio');
            update public.organization_credentials
            set token_twilio_secret_id = v_new_id
            where organization_id = p_org_id;
        end if;
    end if;

    update public.organization_credentials
    set updated_at = now()
    where organization_id = p_org_id;
end;
$$;

-- Resolves one field's decrypted value for an org. Deliberately no role
-- check — this is called from resolve-org-credential.ts via the service-role
-- admin client for AI/notification calls, not directly by a user action, so
-- any tenant member's server-side code path resolving its own org's key is
-- expected. The actual boundary is the grant below: service_role only.
create or replace function public.vault_get_org_credential(p_org_id uuid, p_field text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_secret_id uuid;
    v_value text;
begin
    if p_field not in (
        'api_key_gemini', 'api_key_openai', 'api_key_anthropic',
        'token_resend', 'token_twilio'
    ) then
        raise exception 'invalid credential field: %', p_field;
    end if;

    if p_field = 'api_key_gemini' then
        select api_key_gemini_secret_id into v_secret_id
        from public.organization_credentials where organization_id = p_org_id;
    elsif p_field = 'api_key_openai' then
        select api_key_openai_secret_id into v_secret_id
        from public.organization_credentials where organization_id = p_org_id;
    elsif p_field = 'api_key_anthropic' then
        select api_key_anthropic_secret_id into v_secret_id
        from public.organization_credentials where organization_id = p_org_id;
    elsif p_field = 'token_resend' then
        select token_resend_secret_id into v_secret_id
        from public.organization_credentials where organization_id = p_org_id;
    elsif p_field = 'token_twilio' then
        select token_twilio_secret_id into v_secret_id
        from public.organization_credentials where organization_id = p_org_id;
    end if;

    if v_secret_id is null then
        return null;
    end if;

    select decrypted_secret into v_value
    from vault.decrypted_secrets
    where id = v_secret_id;

    return v_value;
end;
$$;

-- Explicit revoke-then-grant for both functions rather than relying on the
-- table-level ALTER DEFAULT PRIVILEGES REVOKE from Phase 1: Supabase's
-- platform-level default privileges auto-grant EXECUTE on new public-schema
-- functions to anon/authenticated/service_role independent of that
-- statement (confirmed live: get_org_webhook_secret's ACL shows service_role
-- even though only authenticated was ever explicitly granted). Without these
-- explicit revokes, vault_get_org_credential would be callable by
-- authenticated by default — exactly what must not happen.
revoke all on function public.vault_set_org_credential(uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.vault_set_org_credential(uuid, text, text) to authenticated;

revoke all on function public.vault_get_org_credential(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.vault_get_org_credential(uuid, text) to service_role;
