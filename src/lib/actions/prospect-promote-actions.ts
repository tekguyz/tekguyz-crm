"use server";

import { revalidatePath } from "next/cache";

import { insertLeadWithSubmission, isEmailCollision } from "@/lib/leads/create";
import { getCurrentOrg } from "@/lib/organizations/current";
import { buildPromotePayload } from "@/lib/prospects/promote-payload";
import { createClient } from "@/lib/supabase/server";

// Promote a prospect into a real lead.
//
// A NEW file. Nothing in src/lib/actions/ was edited to add it.
//
// THE WRITE PATH IS NOT REIMPLEMENTED HERE. The leads INSERT and its paired
// lead_submissions row both happen inside insertLeadWithSubmission
// (@/lib/leads/create.ts) — the exact function createLead calls. There is no
// second lead-insertion path, no second submission-recording path, and no
// second place that has to remember RLS write handling. That was the single
// non-negotiable of this unit.

export type PromoteState =
  | null
  | { ok: true; leadId: string }
  | {
      ok: false;
      error: string;
      // Set when the failure is something the operator can go look at: the lead
      // that already owns this email, or the lead a concurrent promotion made.
      existingLeadId?: string;
    };

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

  // Cheap pre-check, purely so the common double-click gets a clean message
  // without creating a lead first. It is NOT the guard — the guarded UPDATE
  // below is. Reading promoted_lead_id, never status: status is a label an
  // operator can set by hand and cannot carry the lead's identity.
  const { data: prospect, error: lookupError } = await supabase
    .from("prospects")
    .select("id, promoted_lead_id")
    .eq("id", prospectId)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, error: lookupError.message };
  }
  // RLS turns a cross-tenant id into zero rows rather than an error, so "not
  // found" and "not yours" are the same answer here, which is the correct
  // amount to reveal.
  if (!prospect) {
    return { ok: false, error: "That prospect no longer exists." };
  }
  if (prospect.promoted_lead_id) {
    return {
      ok: false,
      error: "This prospect has already been promoted.",
      existingLeadId: prospect.promoted_lead_id as string,
    };
  }

  const created = await insertLeadWithSubmission(supabase, orgId, lead);

  if (!created.ok) {
    if (isEmailCollision(created.error)) {
      const existingLeadId = await findLeadIdByEmail(supabase, orgId, lead.email);
      return {
        ok: false,
        error: `A lead already uses ${lead.email}. Open it and add the call notes there instead, or promote this prospect with a different email.`,
        existingLeadId: existingLeadId ?? undefined,
      };
    }
    return { ok: false, error: created.error.message };
  }

  // THE guard, and the atomic write, in one statement.
  //
  // One statement is one transaction, so status and promoted_lead_id can never
  // disagree. `.is("promoted_lead_id", null)` is what makes promoting twice
  // impossible: a second promotion matches zero rows instead of overwriting the
  // first one's lead id. This is the only place status becomes 'CONVERTED'.
  const { data: claimed, error: claimError } = await supabase
    .from("prospects")
    .update({ status: "CONVERTED", promoted_lead_id: created.leadId })
    .eq("id", prospectId)
    .is("promoted_lead_id", null)
    .select("id, promoted_lead_id");

  if (claimError) {
    return { ok: false, error: claimError.message };
  }

  // Zero rows affected. Another promotion of the same prospect won the race
  // between the pre-check above and this statement. The lead we just created is
  // real and is now orphaned, so it is named rather than hidden — silently
  // succeeding would leave a duplicate lead nobody knows about, and a generic
  // throw would leave the operator with no idea which lead is the good one.
  if (!claimed || claimed.length === 0) {
    const { data: winner } = await supabase
      .from("prospects")
      .select("promoted_lead_id")
      .eq("id", prospectId)
      .maybeSingle();

    console.error(
      `[promoteProspect] lost the race on prospect ${prospectId}; ` +
        `orphaned lead ${created.leadId} was created and left in place.`,
    );

    revalidatePath("/", "layout");
    return {
      ok: false,
      error:
        "This prospect was already promoted a moment ago. A duplicate lead was created — open the original below and archive the duplicate.",
      existingLeadId: (winner?.promoted_lead_id as string | null) ?? undefined,
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, leadId: created.leadId };
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
