"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";

export type OrgSettingsFormState = { error?: string } | null;

const COMMON_TIMEZONES = new Set([
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
]);

const COMMON_CURRENCIES = new Set(["USD", "EUR", "GBP", "CAD", "AUD"]);

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

  const { error } = await supabase
    .from("organizations")
    .update({ name, timezone, currency_format: currencyFormat })
    .eq("id", orgId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return null;
}
