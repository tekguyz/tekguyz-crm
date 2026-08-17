"use server";

import { getLeadSubmissions, type LeadSubmission } from "@/lib/submissions/queries";

// Client-callable boundary for EnquiryHistory, same shape and reason as
// fetchActivityLogs in lib/activity/actions.ts — the component is a client
// component and cannot import createClient() directly.
//
// Read-only on purpose. There is deliberately no update/delete action in this
// file: the table grants no UPDATE or DELETE to authenticated, so one could not
// work anyway, and adding one would mean first weakening the migration.
export async function fetchLeadSubmissions(leadId: string): Promise<LeadSubmission[]> {
  return getLeadSubmissions(leadId);
}
