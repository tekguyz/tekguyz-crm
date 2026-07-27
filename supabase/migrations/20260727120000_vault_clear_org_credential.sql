-- Adds a "clear this key" RPC alongside the existing rotate-to-new-value
-- vault_set_org_credential (Prompt 13a). Mirrors that function's own
-- OWNER/ADMIN auth.uid() role check exactly -- organization_credentials still
-- has zero RLS policies, so this internal check is the entire authorization
-- boundary for the write path, same as vault_set_org_credential's own comment
-- says.
--
-- Design decision, disclosed per the standing "flag drift, don't paper over
-- it" discipline: this nulls the *_secret_id column only -- it does NOT
-- delete the underlying vault.secrets row. vault_set_org_credential's own
-- established pattern only ever calls the documented Vault API
-- (vault.create_secret / vault.update_secret), never raw DML against vault's
-- own tables, from inside a callable RPC. The one precedent for a raw
-- `DELETE FROM vault.secrets` (Prompt 13a addendum) was a disclosed, one-off
-- manual test-fixture cleanup run via execute_sql outside any application
-- code path -- not a pattern to build into an RPC that any real OWNER/ADMIN
-- can invoke from production at will. The orphaned vault.secrets row has no
-- client-facing surface at all (not exposed via PostgREST, unreachable
-- without the id this function just nulled out of organization_credentials),
-- so clearing is functionally complete from the app's perspective; the
-- tradeoff is a small amount of encrypted dead data left in vault.secrets per
-- cleared key. See the corresponding Known Gaps entry in CLAUDE.md.
create or replace function public.vault_clear_org_credential(p_org_id uuid, p_field text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_role text;
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

    if p_field = 'api_key_gemini' then
        update public.organization_credentials
        set api_key_gemini_secret_id = null, updated_at = now()
        where organization_id = p_org_id;
    elsif p_field = 'api_key_openai' then
        update public.organization_credentials
        set api_key_openai_secret_id = null, updated_at = now()
        where organization_id = p_org_id;
    elsif p_field = 'api_key_anthropic' then
        update public.organization_credentials
        set api_key_anthropic_secret_id = null, updated_at = now()
        where organization_id = p_org_id;
    elsif p_field = 'token_resend' then
        update public.organization_credentials
        set token_resend_secret_id = null, updated_at = now()
        where organization_id = p_org_id;
    elsif p_field = 'token_twilio' then
        update public.organization_credentials
        set token_twilio_secret_id = null, updated_at = now()
        where organization_id = p_org_id;
    end if;
end;
$$;

-- Same explicit revoke-then-grant as vault_set_org_credential/
-- vault_get_org_credential (Prompt 13a) -- Supabase's platform-level default
-- privileges auto-grant EXECUTE on new public-schema functions independent
-- of Phase 1's blanket REVOKE, so this must be stated explicitly rather than
-- assumed covered.
revoke all on function public.vault_clear_org_credential(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.vault_clear_org_credential(uuid, text) to authenticated;
