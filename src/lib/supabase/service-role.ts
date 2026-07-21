import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client scoped exclusively to the webhook ingestion path
 * (lib/webhooks/*). It bypasses RLS entirely, which is required here because
 * an anonymous webhook POST has no auth.uid() for RLS to resolve against.
 *
 * Do not import this outside lib/webhooks/* — any other elevated-access need
 * is a new, explicit decision, not a silent reuse of this client. (A separate
 * general-purpose service-role client, lib/supabase/admin.ts, already exists
 * for other server-action use cases like the credentials vault — this file is
 * intentionally not that one.)
 */
export function createWebhookServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
