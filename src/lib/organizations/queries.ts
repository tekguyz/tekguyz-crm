import { createClient } from "@/lib/supabase/server";

export async function getWebhookSecret(orgId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_org_webhook_secret", {
    p_org_id: orgId,
  });

  if (error) return null;
  return data as string;
}
