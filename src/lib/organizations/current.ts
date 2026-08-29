import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Wrapped in React's cache(), and that is load-bearing rather than a
// micro-optimisation. This is called by (app)/layout.tsx AND by every page
// under it, and each call was a full re-resolution: a network round-trip to
// the Supabase Auth server plus two queries. On a document load that ran
// twice concurrently (measured at 663ms and 683ms for the same request).
// cache() dedupes it per request, so the layout and the page share one result.
// It is per-request memoisation, NOT a cross-request cache — nothing is shared
// between users or tenants.
export const getCurrentOrg = cache(async () => {
  const supabase = await createClient();

  // getClaims, NOT getUser — the same reasoning as the middleware's, and for
  // the same reason it matters twice as much here: this runs on every render
  // of every page, so getUser() put a second network round-trip to the
  // Supabase Auth server in front of every single client-side navigation, on
  // top of the middleware's. getClaims verifies the JWT signature locally
  // against the project's asymmetric (ES256) signing key. It is not
  // getSession(): the signature is checked, so a forged or tampered cookie is
  // rejected exactly as getUser() rejected it.
  //
  // Everything read below comes from the token itself — sub, email and
  // user_metadata are all real claims on a Supabase access token (verified
  // against a live token, not assumed). The one consequence is that
  // user_metadata is as fresh as the token, which lives an hour: that is why
  // updateDisplayName in src/lib/account/actions.ts refreshes the session
  // after writing, so a renamed user is not looking at their old name until
  // the token happens to roll over.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (!claims) {
    redirect("/login");
  }

  const user = {
    id: claims.sub as string,
    email: claims.email as string | undefined,
    user_metadata: (claims.user_metadata ?? {}) as Record<string, unknown>,
  };

  // organization_members can legitimately hold several rows for one user, so
  // "the" membership has to be a defined choice rather than whatever Postgres
  // returned first. Oldest-first: the org a user joined first is the one they
  // land in, stable across sessions and across any later membership. There is
  // deliberately no persisted "active org" and no switcher yet — that needs its
  // own migration; this only makes today's arbitrary pick deterministic.
  // The organization is EMBEDDED in this select rather than fetched by a second
  // round-trip. It used to be two serial queries — memberships, then
  // organizations — and the second could not start until the first named the
  // org id, so the two latencies added up on every render of every page. One
  // PostgREST embed over the existing organization_members -> organizations
  // foreign key returns both in a single round-trip. RLS is unchanged and still
  // applies to the embedded organizations row exactly as it did to the separate
  // query; this is purely one request instead of two.
  const { data: memberships, count } = await supabase
    .from("organization_members")
    .select(
      "organization_id, role, notify_new_lead, notify_weekly_report, organizations(id, name, timezone, currency_format)",
      { count: "exact" },
    )
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

  // Supplied by the embed above. PostgREST types a to-one embed as possibly an
  // array, so it is normalised here rather than at each read site.
  const embedded = membership.organizations;
  const org = (Array.isArray(embedded) ? embedded[0] : embedded) ?? null;

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
});
