import type { SupabaseClient } from "@supabase/supabase-js";

import { recordLeadSubmission } from "@/lib/submissions/record";

// THE one write path that creates a lead from inside the app.
//
// Lifted verbatim out of createLead() in @/lib/leads/actions.ts on 2026-08-26,
// when prospect promotion became a second in-app origin for a lead. It is a
// plain library function rather than a Server Action so both callers can use
// it: createLead needs a LeadFormState back, promoteProspect needs the new
// lead's id, and a Server Action cannot serve both without one of them
// pretending to be a form submission.
//
// Splitting it out is what keeps "every lead carries at least one submission
// from day one" a property of a module instead of a convention two call sites
// have to remember separately — the same reasoning that put
// lib/submissions/record.ts behind a single function. A promotion path that
// inserted its own leads row would have been a parallel write path, and the
// submission would have been the thing quietly left out of it.
//
// Takes the client as an argument, same shape as recordLeadSubmission: the
// caller has already resolved organizationId server-side (getCurrentOrg), and
// passing the session-bound client keeps the leads INSERT going through the
// "Members create tenant leads" WITH CHECK policy rather than around it.

export type NewLeadInput = {
  clientName: string;
  // Caller lowercases. This function does NOT re-lowercase, so a caller that
  // forgets shows up as a real duplicate rather than being silently repaired
  // in one of the two paths and not the other.
  email: string;
  phone?: string | null;
  company?: string | null;
  website?: string | null;
  physicalAddress?: string | null;
  leadSource?: string | null;
  serviceCategory?: string | null;
  estimatedRevenue?: number;
  // Only prospect promotion has anything to say here — the operator's call
  // notes, which ARE a real thing somebody said. createLead passes nothing and
  // stores NULL, because its form has no message field and inventing one would
  // be a fake record of an enquiry that never happened.
  message?: string | null;
};

export type LeadWriteError = { code?: string; message: string };

export type CreateLeadResult =
  | { ok: true; leadId: string }
  | { ok: false; error: LeadWriteError };

// Postgres unique_violation. The one collision this path can hit is
// unique_tenant_client_email_ci — the case-insensitive (organization_id,
// lower(email)) index every lead-origin path keys on. Callers translate it into
// something a human can act on; nothing here guesses at wording.
export const UNIQUE_VIOLATION = "23505";

export function isEmailCollision(error: LeadWriteError | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === UNIQUE_VIOLATION ||
    error.message.includes("unique_tenant_client_email_ci")
  );
}

export async function insertLeadWithSubmission(
  supabase: SupabaseClient,
  organizationId: string,
  input: NewLeadInput,
): Promise<CreateLeadResult> {
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      organization_id: organizationId,
      client_name: input.clientName,
      email: input.email,
      phone: input.phone ?? null,
      company: input.company ?? null,
      website: input.website ?? null,
      physical_address: input.physicalAddress ?? null,
      lead_source: input.leadSource ?? null,
      service_category: input.serviceCategory ?? null,
      estimated_revenue: input.estimatedRevenue ?? 0,
    })
    .select("id")
    .single();

  if (error || !lead) {
    return {
      ok: false,
      error: { code: error?.code, message: error?.message ?? "Could not create the lead." },
    };
  }

  // Throws on failure, by recordLeadSubmission's own design — the submission IS
  // the record of where this lead came from, and losing it silently is the
  // data-loss class lead_submissions was built to close.
  await recordLeadSubmission(supabase, {
    leadId: lead.id,
    organizationId,
    clientName: input.clientName,
    email: input.email,
    phone: input.phone ?? null,
    company: input.company ?? null,
    message: input.message ?? null,
    serviceCategory: input.serviceCategory ?? null,
    leadSource: input.leadSource ?? null,
  });

  return { ok: true, leadId: lead.id };
}
