import { createClient } from "@/lib/supabase/server";
import { isDemoSession } from "@/lib/demo/demo-block";

export async function getWebhookSecret(orgId: string): Promise<string | null> {
  // Demo Block: a Guest never sees the signing secret, so no Demo Org becomes
  // a live webhook endpoint. Settings renders no secret for a null.
  if (await isDemoSession()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_org_webhook_secret", {
    p_org_id: orgId,
  });

  if (error) return null;
  return data as string;
}
