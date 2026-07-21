"use server";

import { createClient } from "@/lib/supabase/server";
import { getActivityLogs, type ActivityLog } from "@/lib/activity/queries";

// Client-callable boundary — ActivityTimeline is a client component (it
// refetches on open and after a note is added), and server-only code like
// createClient() can't be imported into it directly, so this thin "use
// server" wrapper is the entry point instead of calling getActivityLogs().
export async function fetchActivityLogs(leadId: string): Promise<ActivityLog[]> {
  return getActivityLogs(leadId);
}

export async function addManualNote(leadId: string, content: string): Promise<ActivityLog> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Note cannot be empty.");
  }

  const supabase = await createClient();

  // Derive organization_id from the lead itself (RLS-scoped) rather than
  // trusting a client-supplied org id — a lead outside the caller's tenant
  // simply won't be found here, making a cross-tenant note insert impossible.
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("organization_id")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    throw new Error("Lead not found.");
  }

  const { data, error } = await supabase
    .from("activity_logs")
    .insert({
      lead_id: leadId,
      organization_id: lead.organization_id,
      log_type: "MANUAL_NOTE",
      content: trimmed,
    })
    .select("id, lead_id, log_type, content, audio_url, created_at")
    .single();

  if (error) throw error;
  return data;
}
