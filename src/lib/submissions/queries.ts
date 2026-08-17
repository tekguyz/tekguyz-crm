import { createClient } from "@/lib/supabase/server";
import { SUBMISSION_COLUMNS, type RecordedSubmission } from "@/lib/submissions/record";

export type LeadSubmission = RecordedSubmission;

// Read-only by construction: lead_submissions has no UPDATE/DELETE grant and
// no UPDATE/DELETE policy at all, so there is no mutation counterpart to this
// function anywhere and there must never be one. Tenant isolation is the
// "Members read tenant submissions" RLS policy — a lead_id outside the
// caller's org simply returns zero rows, same pattern as getActivityLogs.
export async function getLeadSubmissions(leadId: string): Promise<LeadSubmission[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_submissions")
    .select(SUBMISSION_COLUMNS)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as LeadSubmission[];
}
