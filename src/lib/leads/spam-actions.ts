"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SPAM_DISMISS_PREFIX } from "@/lib/leads/spam-review";

// One-action false-positive dismissal for the Needs Review queue.
//
// Append-only, matching unarchiveLead's SYSTEM_ALERT pattern and this app's
// immutable-timeline design: the shield's original verdict is never edited or
// deleted, a dismissal is simply a newer entry that getLeadsUnderSpamReview's
// latest-entry-wins reduction reads instead. The lead itself is untouched —
// it is already visible and un-archived by this point, so dismissing only
// clears the review badge, it does not "restore" anything.
export async function dismissSpamFlag(leadId: string): Promise<void> {
  const supabase = await createClient();

  // .select().single() per the standard adopted after the rotateWebhookSecret
  // silent-no-op fix — an RLS-denied read must surface, not yield a null org
  // id that would then write a mis-scoped log row.
  const { data: lead, error } = await supabase
    .from("leads")
    .select("organization_id")
    .eq("id", leadId)
    .single();

  if (error) throw error;

  const { error: logError } = await supabase.from("activity_logs").insert({
    lead_id: leadId,
    organization_id: lead.organization_id,
    log_type: "SYSTEM_ALERT",
    content: `${SPAM_DISMISS_PREFIX} — reviewed and kept as a genuine lead.`,
  });

  if (logError) throw logError;

  revalidatePath("/", "layout");
}
