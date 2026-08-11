import { createClient } from "@/lib/supabase/server";

// "Under spam review" is derived from activity_logs rather than stored on the
// lead, deliberately:
//   - `archived` is what USED to carry it, and that was the bug — archiving
//     hid the lead from every list query and suppressed its notification.
//   - `status` can't carry it: leads_check_valid_status is a CHECK constraint
//     over exactly NEW/DISCOVERY/QUOTED/ACTIVE, so a REVIEW value needs DDL.
//   - activity_logs already holds the shield's verdict as a durable, immutable
//     record, and this app's timeline is append-only by design — so a dismissal
//     is a new entry, not an edit, and the full history stays auditable.
// A dedicated `leads.spam_review` column would be sturdier than prefix-matching
// log text; see the report for what that migration would take.
export const SPAM_FLAG_PREFIX = "Flagged as likely spam by AI Spam Shield: ";
export const SPAM_DISMISS_PREFIX = "Spam flag dismissed";

export type FlaggedLead = {
  id: string;
  client_name: string;
  company: string | null;
  email: string;
  reason: string;
  flagged_at: string;
};

type AlertRow = {
  lead_id: string;
  content: string;
  created_at: string;
  leads: { id: string; client_name: string; company: string | null; email: string } | null;
};

// Latest-entry-wins: a lead is under review only if its most recent
// spam-related alert is a flag rather than a dismissal, so "Not spam" is
// durable and a later re-flag would legitimately re-open it.
export async function getLeadsUnderSpamReview(orgId: string): Promise<FlaggedLead[]> {
  const supabase = await createClient();

  // leads!inner keeps archived leads out — same defense-in-depth join filter
  // the Tasks Due queue uses, so a manually-archived lead never resurfaces
  // here just because it still carries an old flag.
  const { data, error } = await supabase
    .from("activity_logs")
    .select("lead_id, content, created_at, leads!inner(id, client_name, company, email)")
    .eq("organization_id", orgId)
    .eq("log_type", "SYSTEM_ALERT")
    .eq("leads.archived", false)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const latest = new Map<string, AlertRow>();
  for (const row of (data ?? []) as unknown as AlertRow[]) {
    const isFlag = row.content.startsWith(SPAM_FLAG_PREFIX);
    const isDismissal = row.content.startsWith(SPAM_DISMISS_PREFIX);
    if (isFlag || isDismissal) latest.set(row.lead_id, row);
  }

  return [...latest.values()]
    .filter((row) => row.content.startsWith(SPAM_FLAG_PREFIX) && row.leads)
    .map((row) => ({
      id: row.leads!.id,
      client_name: row.leads!.client_name,
      company: row.leads!.company,
      email: row.leads!.email,
      reason: row.content.slice(SPAM_FLAG_PREFIX.length),
      flagged_at: row.created_at,
    }))
    .sort((a, b) => b.flagged_at.localeCompare(a.flagged_at));
}
