import type { SupabaseClient } from "@supabase/supabase-js";

// The one write path into lead_submissions. Every place a lead can originate
// goes through here — the webhook, createLead, and CSV import — so "every lead
// has at least one submission from day one" is a property of this module, not
// a convention three call sites have to remember separately.
//
// Takes the client as an argument rather than building one (same shape as
// lib/import/insert-chunks.ts): the webhook path passes the service-role
// client, which is the only client an anonymous POST can use since there is no
// auth.uid() for RLS to resolve against; the two in-app paths pass the
// session-bound client and go through the "Members create tenant submissions"
// WITH CHECK policy.
//
// organization_id is always resolved server-side by the caller — getCurrentOrg()
// in-app, the webhook-secret lookup for inbound traffic — and is never read
// from a client-supplied field.

export type SubmissionInput = {
  leadId: string;
  organizationId: string;
  clientName: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  message?: string | null;
  serviceCategory?: string | null;
  leadSource?: string | null;
  // Only the webhook has a real external body. The in-app paths pass nothing,
  // which stores NULL — an honest "there was no payload" rather than a
  // synthesized one that would look like a receipt it is not.
  rawPayload?: unknown;
};

export type RecordedSubmission = {
  id: string;
  lead_id: string;
  client_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  service_category: string | null;
  lead_source: string | null;
  created_at: string;
};

export const SUBMISSION_COLUMNS =
  "id, lead_id, client_name, email, phone, company, message, service_category, lead_source, created_at";

const toRow = (input: SubmissionInput) => ({
  lead_id: input.leadId,
  organization_id: input.organizationId,
  client_name: input.clientName,
  email: input.email,
  phone: input.phone ?? null,
  company: input.company ?? null,
  message: input.message ?? null,
  service_category: input.serviceCategory ?? null,
  lead_source: input.leadSource ?? null,
  raw_payload: input.rawPayload ?? null,
});

// Throws on failure. Used by the webhook path, where the submission IS the
// record of the enquiry — losing it silently would recreate exactly the
// data-loss class this table exists to close, so the ingest call fails loudly
// instead.
export async function recordLeadSubmission(
  supabase: SupabaseClient,
  input: SubmissionInput,
): Promise<RecordedSubmission> {
  const { data, error } = await supabase
    .from("lead_submissions")
    .insert(toRow(input))
    .select(SUBMISSION_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data as RecordedSubmission;
}

// Bulk, best-effort variant for CSV import. Mirrors logImportedLeads' stance
// deliberately: the leads themselves are already committed by the time this
// runs, so a failed submission chunk logs and moves on rather than failing an
// import that otherwise succeeded.
const CHUNK_SIZE = 250;

export async function recordLeadSubmissions(
  supabase: SupabaseClient,
  inputs: SubmissionInput[],
): Promise<void> {
  const rows = inputs.map(toRow);

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const { error } = await supabase.from("lead_submissions").insert(rows.slice(i, i + CHUNK_SIZE));
    if (error) {
      console.error(`[recordLeadSubmissions] chunk at ${i} failed:`, error.message);
    }
  }
}
