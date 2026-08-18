"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";
import { teamErrorMessage } from "@/lib/organizations/team-errors";

// Client-callable boundary for the two team-management RPCs.
//
// Its own module rather than an addition to lib/invites/actions.ts: that file
// is about invitations, and these are about existing members. They share a
// table and nothing else.
//
// Neither action takes an organization id from the caller. The org is resolved
// server-side by getCurrentOrg() from the session, so a client cannot even name
// a different tenant. That is belt-and-braces rather than the boundary — both
// RPCs re-resolve the caller's own role for the org id they are passed, inside
// the function body — but a parameter that is never accepted is a parameter
// that cannot be tampered with.

export type TeamActionResult = { error?: string; leftOrganization?: boolean } | null;

const VALID_ROLES = new Set(["OWNER", "ADMIN", "MEMBER"]);

export async function changeMemberRole(
  targetUserId: string,
  newRole: string,
): Promise<TeamActionResult> {
  // Rejected here as well as in the RPC. Not defence in depth so much as a
  // better error: an unknown string would otherwise reach Postgres and come
  // back as a constraint message.
  if (!VALID_ROLES.has(newRole)) {
    return { error: "That is not a valid role." };
  }

  const { orgId } = await getCurrentOrg();
  const supabase = await createClient();

  const { error } = await supabase.rpc("change_member_role", {
    p_org_id: orgId,
    p_target_user_id: targetUserId,
    p_new_role: newRole,
  });

  if (error) {
    // Logged in full server-side, translated for the user. teamErrorMessage
    // deliberately does not pass an unrecognised message through — an error
    // outside the enumerated set is a bug, and this console line is where it
    // gets found.
    console.error("[changeMemberRole]", error);
    return { error: teamErrorMessage(error) };
  }

  revalidatePath("/settings");
  return null;
}

export async function removeMember(targetUserId: string): Promise<TeamActionResult> {
  const { orgId, userId } = await getCurrentOrg();
  const supabase = await createClient();

  const { error } = await supabase.rpc("remove_organization_member", {
    p_org_id: orgId,
    p_target_user_id: targetUserId,
  });

  if (error) {
    console.error("[removeMember]", error);
    return { error: teamErrorMessage(error) };
  }

  revalidatePath("/settings");

  // Removing yourself ends your access to this org, so /settings is about to
  // stop existing for you. Reported back rather than redirected from here:
  // Next's redirect() throws, which would escape the caller's try/catch and be
  // reported as a failure by the confirmation dialog. The client navigates
  // instead, once it has shown the outcome. getCurrentOrg() then finds no
  // membership and sends the user to /onboarding on its own.
  return userId === targetUserId ? { leftOrganization: true } : null;
}
