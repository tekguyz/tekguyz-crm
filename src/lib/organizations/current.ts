import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role, notify_new_lead, notify_weekly_report")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, timezone, currency_format")
    .eq("id", membership.organization_id)
    .single();

  return {
    userEmail: user.email ?? "",
    // Account-level, not org-level — lives in auth.users' own user_metadata
    // (updateDisplayName in lib/account/actions.ts), not a new column on any
    // tenant table. Falls back to null so callers decide their own default
    // (Header falls back to the email's first character, as before).
    displayName: (user.user_metadata?.display_name as string | undefined)?.trim() || null,
    orgId: membership.organization_id as string,
    orgName: org?.name ?? "Organization",
    orgTimezone: org?.timezone ?? "UTC",
    currencyFormat: org?.currency_format ?? "USD",
    role: membership.role as string,
    notifyNewLead: membership.notify_new_lead as boolean,
    notifyWeeklyReport: membership.notify_weekly_report as boolean,
  };
}
