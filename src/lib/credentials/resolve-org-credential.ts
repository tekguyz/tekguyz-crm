import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type CredentialKey =
  | "api_key_gemini"
  | "api_key_openai"
  | "api_key_anthropic"
  | "token_resend"
  | "token_twilio";

export type CredentialResult = { value: string | null; source: "org" | "platform" | "none" };

const PLATFORM_ENV_VAR: Record<CredentialKey, string> = {
  api_key_gemini: "PLATFORM_GEMINI_API_KEY",
  api_key_openai: "PLATFORM_OPENAI_API_KEY",
  api_key_anthropic: "PLATFORM_ANTHROPIC_API_KEY",
  token_resend: "PLATFORM_RESEND_API_KEY",
  token_twilio: "PLATFORM_TWILIO_TOKEN",
};

// Single source of truth for "which key do we actually use," reused by every
// BYO-credential-dependent feature (Spam Shield, Resend notifications today;
// voice transcription and future integrations later) — do not write a
// per-provider resolver.
//
// NOTE: organization_credentials stores Vault secret UUIDs, not plaintext,
// as of Prompt 13a. The decrypted value is only reachable through the
// vault schema (not exposed via PostgREST), so this goes through the
// vault_get_org_credential SECURITY DEFINER RPC rather than a raw select on
// the table — see supabase/migrations/20260722140000_vault_encrypt_credentials.sql.
// That RPC is granted to service_role only, so this must stay on the admin
// (service-role) client.
export async function resolveOrgCredential(
  organizationId: string,
  key: CredentialKey,
): Promise<CredentialResult> {
  const supabase = createAdminClient();
  const { data: orgValue } = await supabase.rpc("vault_get_org_credential", {
    p_org_id: organizationId,
    p_field: key,
  });

  if (orgValue) {
    return { value: orgValue as string, source: "org" };
  }

  const platformValue = process.env[PLATFORM_ENV_VAR[key]];
  if (platformValue) {
    return { value: platformValue, source: "platform" };
  }

  return { value: null, source: "none" };
}
