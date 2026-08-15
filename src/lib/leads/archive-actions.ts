"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { closeTasksForArchivedLead } from "@/lib/tasks/actions";
import { isLeadRoleDenied, LEAD_ROLE_DENIED_MESSAGE } from "@/lib/leads/role-errors";

// Returned rather than thrown, and only for the role denial — every other
// failure still throws, so ArchiveControls' existing catch/retry path is
// untouched. Thrown messages are the wrong channel for anything the user is
// meant to read: Next.js redacts Server Action error messages in a production
// build, so a `throw new Error("only an owner can…")` would reach the browser
// as a generic digest string and the specific reason would be lost.
export type LeadArchiveResult = { error: string } | null;

// Split out of lib/leads/actions.ts on 2026-07-28: that file had reached 219
// lines against this project's 200-line cap after Task/Calendar Prompt 4
// hardened archiveLead, and could not fit the change at any comment density.
// The archive/unarchive pair is the natural seam — a self-contained lifecycle
// concern (this app's only "delete", plus its inverse), extracted as a sibling
// module at the same directory level per CLAUDE.md § File Bloat Prevention.
//
// Pure extraction — both functions are verbatim, no behavior change.

// Archiving is this app's only "delete", so it also closes the lead's open
// tasks — nothing should linger in the org-wide Tasks Due list pointing at an
// archived lead. One direction only: tasks closed this way stay closed if the
// lead is later unarchived (explicit v1 non-goal).
//
// `.select().single()` chained per the standard adopted after the
// rotateWebhookSecret silent-no-op fix — the previous bare `.update().eq()`
// discarded its result, so an RLS-denied archive reported success. It also
// yields the organization_id the SYSTEM_ALERT needs, as unarchiveLead does.
export async function archiveLead(leadId: string): Promise<LeadArchiveResult> {
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .update({ archived: true })
    .eq("id", leadId)
    .select("organization_id")
    .single();

  if (isLeadRoleDenied(error)) return { error: LEAD_ROLE_DENIED_MESSAGE };
  if (error) throw error;

  // Never throws by construction — cleanup must not roll back the archive.
  await closeTasksForArchivedLead(leadId, lead.organization_id);

  revalidatePath("/", "layout");
  return null;
}

// The in-app equivalent of what the webhook Resurrection Engine already does
// automatically (lib/webhooks/ingest-lead.ts) when an archived lead's email
// resubmits: archived -> false and status reset to NEW, not left at whatever
// status it had when archived — same reasoning applies here, a "revived"
// lead re-enters the pipeline as a fresh one rather than resuming mid-deal.
// Logs a SYSTEM_ALERT for the same audit-trail reason the webhook path does.
export async function unarchiveLead(leadId: string): Promise<LeadArchiveResult> {
  const supabase = await createClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .update({ archived: false, status: "NEW" })
    .eq("id", leadId)
    .select("organization_id")
    .single();

  if (isLeadRoleDenied(error)) return { error: LEAD_ROLE_DENIED_MESSAGE };
  if (error) throw error;

  await supabase.from("activity_logs").insert({
    lead_id: leadId,
    organization_id: lead.organization_id,
    log_type: "SYSTEM_ALERT",
    content: "Lead manually restored from archive — status reset to New.",
  });

  revalidatePath("/", "layout");
  return null;
}
