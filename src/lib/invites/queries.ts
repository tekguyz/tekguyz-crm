import { createClient } from "@/lib/supabase/server";

export type TeamMember = {
  user_id: string;
  email: string;
  role: string;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
};

/**
 * A PENDING invite split by whether it can still be accepted.
 *
 * Both halves matter. An expired PENDING row is not merely dead — it still
 * occupies `unique_pending_invite_per_org_email`, so it keeps blocking any new
 * invite to that address. Hiding it would hide the block, so it is surfaced as
 * a problem to be revoked rather than dropped from the UI entirely.
 */
export type InviteBuckets = {
  pending: PendingInvite[];
  expired: PendingInvite[];
};

export async function getTeamMembers(orgId: string): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_organization_members", {
    p_org_id: orgId,
  });

  if (error) throw error;
  return data;
}

/**
 * Splits PENDING invites into still-live and expired.
 *
 * Pure and exported so the filter itself is testable without a database — the
 * status filter lives in the query below, the clock comparison lives here.
 */
export function partitionInvitesByExpiry(
  invites: PendingInvite[],
  now: Date = new Date(),
): InviteBuckets {
  const pending: PendingInvite[] = [];
  const expired: PendingInvite[] = [];

  for (const invite of invites) {
    if (new Date(invite.expires_at).getTime() < now.getTime()) {
      expired.push(invite);
    } else {
      pending.push(invite);
    }
  }

  return { pending, expired };
}

/**
 * Fetches this org's open invites.
 *
 * The status filter is deliberately the positive `= 'PENDING'`, never
 * `<> 'REVOKED'`. An ACCEPTED invite is not a pending one, and a negative
 * filter would silently start rendering any status added later.
 */
export async function getOpenInvites(orgId: string): Promise<InviteBuckets> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_invites")
    .select("id, email, role, token, expires_at")
    .eq("organization_id", orgId)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return partitionInvitesByExpiry((data ?? []) as PendingInvite[]);
}
