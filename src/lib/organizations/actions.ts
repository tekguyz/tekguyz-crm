"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";
import { TIMEZONES, CURRENCIES } from "@/lib/organizations/org-options";

export type OrgSettingsFormState = { error?: string } | null;

const COMMON_TIMEZONES = new Set(TIMEZONES);
const COMMON_CURRENCIES = new Set(CURRENCIES);

export async function updateOrgSettings(
  _prevState: OrgSettingsFormState,
  formData: FormData,
): Promise<OrgSettingsFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "UTC");
  const currencyFormat = String(formData.get("currency_format") ?? "USD");

  if (!name) {
    return { error: "Organization name is required." };
  }
  if (!COMMON_TIMEZONES.has(timezone)) {
    return { error: "Invalid timezone." };
  }
  if (!COMMON_CURRENCIES.has(currencyFormat)) {
    return { error: "Invalid currency." };
  }

  const { orgId } = await getCurrentOrg();
  const supabase = await createClient();

  // .select("id").single() is load-bearing for the same reason it is in
  // rotateWebhookSecret below: the organizations UPDATE policy is OWNER/ADMIN
  // only, and a role-denied RLS UPDATE matches zero rows with error === null
  // rather than raising — so a bare .update().eq() reports success on a save
  // that never happened. .single() turns that into a real PGRST116 error.
  // Unlike rotateWebhookSecret this has no app-level role pre-check, so this
  // is the only thing standing between a MEMBER and a false "Saved."
  const { error } = await supabase
    .from("organizations")
    .update({ name, timezone, currency_format: currencyFormat })
    .eq("id", orgId)
    .select("id")
    .single();

  if (error) {
    // Only PGRST116 means "matched zero rows"; a genuine database error still
    // surfaces its own message rather than being mislabelled a permission
    // problem.
    return {
      error:
        error.code === "PGRST116"
          ? "Couldn't save those settings — only owners and admins can update the organization."
          : error.message,
    };
  }

  revalidatePath("/", "layout");
  return null;
}

export type RotateWebhookSecretResult = { signingSecret?: string; error?: string };

// "Owners and admins update their organization" (the organizations RLS UPDATE
// policy, with its paired WITH CHECK) already covers webhook_secret — it's a
// row-level policy, not column-scoped — so this goes through a plain
// session-bound UPDATE rather than a new SECURITY DEFINER RPC. Unlike
// vault_set_org_credential's pattern, a role-denied RLS UPDATE doesn't raise
// an exception, it just matches zero rows silently — so the role check below
// is the real enforcement boundary here, not just a fast-fail optimization.
//
// Rotation is unchanged in mechanism and unchanged for the user (2026-08-18):
// same column, same role gate, same immediate cutover. What rotates is now the
// HMAC SIGNING KEY rather than a bearer value in the URL, so the endpoint URL
// itself no longer changes — it is keyed on organization_id, which is stable.
// Integrations update the secret they sign with; they do not re-point the URL.
export async function rotateWebhookSecret(): Promise<RotateWebhookSecretResult> {
  const { orgId, role } = await getCurrentOrg();

  if (role !== "OWNER" && role !== "ADMIN") {
    return { error: "Only owners and admins can rotate the webhook secret." };
  }

  const newSecret = randomUUID();
  const supabase = await createClient();
  // .select().single() is load-bearing, not incidental: a role-denied RLS
  // UPDATE matches zero rows with error === null (see the comment above),
  // so a bare .update().eq() would report success on a mutation that never
  // happened. .single() turns "zero rows returned" into a real Postgrest
  // error (PGRST116), which is what actually catches that case here.
  const { error } = await supabase
    .from("organizations")
    .update({ webhook_secret: newSecret })
    .eq("id", orgId)
    .select("id")
    .single();

  if (error) {
    return { error: "Failed to rotate the webhook secret — no organization row was updated." };
  }

  revalidatePath("/", "layout");

  return { signingSecret: newSecret };
}
