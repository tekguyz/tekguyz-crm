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
    .select("organization_id, role")
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
    orgId: membership.organization_id as string,
    orgName: org?.name ?? "Organization",
    orgTimezone: org?.timezone ?? "UTC",
    currencyFormat: org?.currency_format ?? "USD",
    role: membership.role as string,
  };
}
