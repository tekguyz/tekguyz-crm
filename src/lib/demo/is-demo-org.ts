import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Single source of truth for "is this the public demo tenant". Keyed on the
// organization rather than on a user id, so it still holds if a second demo
// identity is ever added. Two consumers: the weekly-report cron's org sweep,
// and the voice-transcription skip.
//
// Service-role client: organizations.is_demo must be readable for an org the
// caller may not be a member of — the cron runs with no user at all.
export async function isDemoOrg(organizationId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("is_demo")
    .eq("id", organizationId)
    .maybeSingle();

  // Failing toward "treat it as a demo" would be WRONG here: a transient error
  // would silently suppress a real org's weekly report, which is the exact
  // class of invisible failure this codebase keeps getting bitten by. Fail
  // toward "not a demo" and let the caller's existing error handling deal with
  // anything downstream.
  if (error || !data) return false;
  return data.is_demo === true;
}
