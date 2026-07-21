import "server-only";
import { createWebhookServiceClient } from "@/lib/supabase/service-role";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Resolves the tenant strictly from the URL secret — this is the only
// tenant-scoping input this whole route trusts. A malformed secret is
// rejected before it ever reaches the database.
export async function resolveOrgBySecret(secret: string): Promise<string | null> {
  if (!UUID_RE.test(secret)) {
    return null;
  }

  const supabase = createWebhookServiceClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("webhook_secret", secret)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}
