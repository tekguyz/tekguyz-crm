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

  // organization_members can legitimately hold several rows for one user, so
  // "the" membership has to be a defined choice rather than whatever Postgres
  // returned first. Oldest-first: the org a user joined first is the one they
  // land in, stable across sessions and across any later membership. There is
  // deliberately no persisted "active org" and no switcher yet — that needs its
  // own migration; this only makes today's arbitrary pick deterministic.
  const { data: memberships, count } = await supabase
    .from("organization_members")
    .select("organization_id, role, notify_new_lead, notify_weekly_report", {
      count: "exact",
    })
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  const membership = memberships?.[0];

  if (!membership) {
    redirect("/onboarding");
  }

  // Logged, never thrown. Multi-org membership is expected and must keep
  // working; what must not happen is it being invisible, because until an org
  // switcher exists the user has no way to reach their other orgs and no
  // signal that they exist.
  if ((count ?? 0) > 1) {
    console.warn(
      `[getCurrentOrg] user ${user.id} has ${count} organization memberships; ` +
        `resolved to the oldest (${membership.organization_id}). ` +
        `The other orgs are unreachable until an org switcher exists.`,
    );
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, timezone, currency_format")
    .eq("id", membership.organization_id)
    .single();

  return {
    // The auth.users id, not the organization_members row id. This is what
    // leads.assigned_to stores, so it is what the "My Leads" filter compares
    // against — see getPipelineLeads/getAllContacts in lib/leads/queries.ts.
    userId: user.id,
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
