"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";

export type AccountFormState = { error?: string; success?: boolean } | null;

export async function updateDisplayName(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { display_name: displayName || null },
  });

  if (error) {
    return { error: error.message };
  }

  // Mint a new access token before revalidating, and that ordering is
  // load-bearing. getCurrentOrg reads display_name out of the JWT's
  // user_metadata claim rather than paying a network round-trip to the Auth
  // server on every page render, and updateUser above does NOT reissue the
  // token — it only writes the record. Without this refresh the old name stays
  // in the cookie for the rest of the token's hour and the rename silently
  // appears not to have worked. Failure here is not fatal: the write already
  // succeeded, and the name appears on the next token roll.
  await supabase.auth.refreshSession();

  // Header (rendered by the shared (app) layout) reads displayName from
  // getCurrentOrg() on every request — a full layout revalidation is what
  // makes the new name actually show up there without a hard reload.
  revalidatePath("/", "layout");
  return { success: true };
}

// Checkboxes only appear in FormData when checked, so a missing key means
// "unchecked" — this is standard HTML form behavior, not a bug to guard
// against with a hidden fallback field.
export async function updateNotificationPreferences(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const notifyNewLead = formData.get("notify_new_lead") === "on";
  const notifyWeeklyReport = formData.get("notify_weekly_report") === "on";

  const { orgId } = await getCurrentOrg();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // The column-scoped GRANT + "own row only" RLS policy (see the migration)
  // is the entire write boundary here — a member can only ever touch these
  // two columns on their own row, never role or organization_id.
  // .select().single() matters, not just for consistency with
  // rotateWebhookSecret's own fix: it turns a zero-row RLS-denied UPDATE
  // into a real Postgrest error instead of a silent false "saved" success.
  const { error } = await supabase
    .from("organization_members")
    .update({ notify_new_lead: notifyNewLead, notify_weekly_report: notifyWeeklyReport })
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .select("user_id")
    .single();

  if (error) {
    return { error: "Failed to save notification preferences." };
  }

  revalidatePath("/settings");
  return { success: true };
}
