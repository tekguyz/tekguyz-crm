"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";
import { credentialsFormSchema } from "@/lib/validation/credentials-schema";

export type CredentialStatus = { hasGeminiKey: boolean; hasAnthropicKey: boolean };

// Deliberately takes no organizationId argument, even though this is called
// directly from a client component (ApiKeysPanel, on mount) — a client-
// supplied org id can't be trusted for authorization, so the org is always
// derived from the caller's own session instead. Returns booleans only; the
// raw/decrypted value never leaves this function under any circumstance.
export async function getCredentialStatus(): Promise<CredentialStatus> {
  const { orgId } = await getCurrentOrg();

  // organization_credentials has zero RLS policies (service-role only) — even
  // a presence check has to go through the admin client. Presence is read
  // straight off the *_secret_id columns (a Vault UUID, never the decrypted
  // value) — no RPC needed since a boolean "is this column null" doesn't
  // touch vault.decrypted_secrets at all.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("organization_credentials")
    .select("api_key_gemini_secret_id, api_key_anthropic_secret_id")
    .eq("organization_id", orgId)
    .maybeSingle();

  return {
    hasGeminiKey: Boolean(data?.api_key_gemini_secret_id),
    hasAnthropicKey: Boolean(data?.api_key_anthropic_secret_id),
  };
}

export type CredentialsFormState = { error?: string; success?: boolean } | null;

export async function saveOrganizationCredentials(
  _prevState: CredentialsFormState,
  formData: FormData,
): Promise<CredentialsFormState> {
  const { orgId, role } = await getCurrentOrg();

  // Fast-fail before touching Vault at all. The real boundary is
  // vault_set_org_credential's own internal role check (this table has no
  // RLS policies), but there's no reason to even attempt the RPC call for a
  // MEMBER when it's guaranteed to be rejected.
  if (role !== "OWNER" && role !== "ADMIN") {
    return { error: "Only owners and admins can update API keys." };
  }

  const parsed = credentialsFormSchema.safeParse({
    api_key_gemini: formData.get("api_key_gemini"),
    api_key_anthropic: formData.get("api_key_anthropic"),
  });

  if (!parsed.success) {
    return { error: "Invalid input." };
  }

  // Blank field means "leave unchanged" (fields render masked, not with the
  // real value) — a dedicated "clear key" control would be a separate,
  // explicit action, not an accidental side effect of an empty submit.
  const updates: Record<string, string> = {};
  if (parsed.data.api_key_gemini) updates.api_key_gemini = parsed.data.api_key_gemini;
  if (parsed.data.api_key_anthropic) updates.api_key_anthropic = parsed.data.api_key_anthropic;

  if (Object.keys(updates).length === 0) {
    return { error: "Enter at least one key to save." };
  }

  // vault_set_org_credential re-checks OWNER/ADMIN via auth.uid() internally
  // (the app-level check above is a fast-fail, not the real boundary — the
  // RPC is), which means this must go through the session-bound client, not
  // the service-role admin client: auth.uid() resolves to NULL under
  // service-role and the RPC would reject every call as unauthorized.
  const supabase = await createClient();
  for (const [field, value] of Object.entries(updates)) {
    const { error } = await supabase.rpc("vault_set_org_credential", {
      p_org_id: orgId,
      p_field: field,
      p_value: value,
    });

    if (error) {
      return { error: error.message };
    }
  }

  return { success: true };
}
