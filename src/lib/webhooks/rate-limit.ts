import "server-only";
import { createWebhookServiceClient } from "@/lib/supabase/service-role";

// Threshold for inbound webhook volume per tenant. Reuses the existing
// activity_logs table (WEBHOOK rows) instead of a dedicated rate-limit table.
export const WEBHOOK_RATE_LIMIT_PER_MINUTE = 30;
const RATE_LIMIT_WINDOW_SECONDS = 60;

export async function isRateLimited(organizationId: string): Promise<boolean> {
  const supabase = createWebhookServiceClient();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();

  const { count, error } = await supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("log_type", "WEBHOOK")
    .gte("created_at", windowStart);

  if (error) {
    // Fail closed would block a tenant on an infra hiccup; fail open here
    // since this is a volume guard, not a security boundary.
    return false;
  }

  return (count ?? 0) >= WEBHOOK_RATE_LIMIT_PER_MINUTE;
}
