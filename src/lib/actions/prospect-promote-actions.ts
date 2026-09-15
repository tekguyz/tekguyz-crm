"use server";

import { revalidatePath } from "next/cache";

import { isEmailCollision } from "@/lib/leads/create";
import { getCurrentOrg } from "@/lib/organizations/current";
import { buildPromotePayload } from "@/lib/prospects/promote-payload";
import { createClient } from "@/lib/supabase/server";

// Promote a prospect into a real lead.
//
// ONE database call. The leads INSERT, its paired lead_submissions row and the
// guarded prospect claim all happen inside public.promote_prospect
// (supabase/migrations/20260914120000_promote_prospect_rpc.sql), which runs
// them as a single transaction with the prospect row locked FOR UPDATE first.
//
// Until 2026-09-14 this action did those writes as separate round trips, so a
// concurrent promotion winning the race between the lead insert and the claim
// left a real, unreferenced lead behind. That path no longer exists: either all
// three rows commit, or none do, and a second promotion of the same prospect
// gets ALREADY_PROMOTED without inserting anything.
//
// The RPC re-checks the caller's membership for orgId itself, because SECURITY
// DEFINER bypasses RLS. orgId still comes from getCurrentOrg(), never the form.

export type PromoteState =
  | null
  | { ok: true; leadId: string }
  | {
      ok: false;
      error: string;
      // Set when the failure is something the operator can go look at: the lead
      // that already owns this email, or the lead an earlier promotion made.
      existingLeadId?: string;
    };

type PromoteRow = { outcome: "PROMOTED" | "ALREADY_PROMOTED"; promoted_lead: string };

// The RPC's "prospect not found, or not in your org" SQLSTATE.
const NOT_FOUND = "P0002";

export async function promoteProspect(
  _prevState: PromoteState,
  formData: FormData,
): Promise<PromoteState> {
  const parsed = buildPromotePayload(formData);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const { prospectId, lead } = parsed.payload;
  const { orgId } = await getCurrentOrg();
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("promote_prospect", {
      p_org_id: orgId,
      p_prospect_id: prospectId,
      p_client_name: lead.clientName,
      p_email: lead.email,
      p_phone: lead.phone ?? null,
      p_company: lead.company ?? null,
      p_website: lead.website ?? null,
      p_physical_address: lead.physicalAddress ?? null,
      p_service_category: lead.serviceCategory ?? null,
      p_lead_source: lead.leadSource ?? null,
      p_estimated_revenue: lead.estimatedRevenue ?? 0,
      p_message: lead.message ?? null,
    })
    .single<PromoteRow>();

  if (error) {
    if (isEmailCollision(error)) {
      const existingLeadId = await findLeadIdByEmail(supabase, orgId, lead.email);
      return {
        ok: false,
        error: `A lead already uses ${lead.email}. Open it and add the call notes there instead, or promote this prospect with a different email.`,
        existingLeadId: existingLeadId ?? undefined,
      };
    }
    // Another tenant's prospect id and a prospect that is gone are the same
    // answer, which is the correct amount to reveal.
    if (error.code === NOT_FOUND) {
      return { ok: false, error: "That prospect no longer exists." };
    }
    return { ok: false, error: error.message };
  }

  // The double-click and the lost race both land here. Nothing was written,
  // so there is no duplicate to warn about — only the original to link to.
  if (data.outcome === "ALREADY_PROMOTED") {
    revalidatePath("/", "layout");
    return {
      ok: false,
      error: "This prospect has already been promoted.",
      existingLeadId: data.promoted_lead,
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, leadId: data.promoted_lead };
}

// Only ever called after a confirmed unique_tenant_client_email_ci violation, to
// turn "that email is taken" into a link the operator can actually follow.
// ilike with no wildcards is case-insensitive equality — the stored value is
// lowercased by every current write path, but rows predating
// 20260726120000_case_insensitive_email.sql may not be.
async function findLeadIdByEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  email: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("leads")
    .select("id")
    .eq("organization_id", orgId)
    .ilike("email", email)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}
