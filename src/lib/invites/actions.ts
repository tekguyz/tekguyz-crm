"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";

export type InviteFormState = { error?: string } | null;

const VALID_INVITE_ROLES = new Set(["ADMIN", "MEMBER"]);

export async function createInvite(
  _prevState: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "MEMBER");

  if (!email) {
    return { error: "Email is required." };
  }
  if (!VALID_INVITE_ROLES.has(role)) {
    return { error: "Invalid role." };
  }

  const { orgId } = await getCurrentOrg();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase.from("organization_invites").insert({
    organization_id: orgId,
    email,
    role,
    invited_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  return null;
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("organization_invites")
    .update({ status: "REVOKED" })
    .eq("id", inviteId);
  revalidatePath("/settings");
}

export type AcceptInviteState = { error?: string } | null;

export async function acceptInvite(
  token: string,
  _prevState: AcceptInviteState,
  _formData: FormData,
): Promise<AcceptInviteState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_organization_invite", {
    p_token: token,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}
