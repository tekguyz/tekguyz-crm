import "server-only";
import { createWebhookServiceClient } from "@/lib/supabase/service-role";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Looks up a tenant's HMAC signing key by its plain `organization_id`.
 *
 * WHAT CHANGED (2026-08-18): this used to be `resolveOrgBySecret`, which took
 * the URL-path secret and did tenant resolution AND authentication in one
 * step. Those are now split. The `organization_id` this receives comes
 * straight off the URL and is NOT a credential — it grants nothing on its own.
 * Finding a row here means only "this tenant exists"; the caller must still
 * pass verifyWebhookSignature() against the key returned, and the route
 * rejects an unsigned request for a real org exactly as hard as one for an
 * org that does not exist.
 *
 * The malformed-UUID guard stays: it keeps junk out of the database, and it is
 * no longer load-bearing for security now that the value is not secret.
 */
export async function getOrgSigningKey(organizationId: string): Promise<string | null> {
  if (!UUID_RE.test(organizationId)) {
    return null;
  }

  const supabase = createWebhookServiceClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("webhook_secret")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data?.webhook_secret) {
    return null;
  }

  return data.webhook_secret as string;
}
