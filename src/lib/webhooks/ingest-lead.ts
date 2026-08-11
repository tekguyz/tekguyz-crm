import "server-only";
import { createWebhookServiceClient } from "@/lib/supabase/service-role";
import type { ValidatedWebhookPayload } from "@/lib/validation/webhook-payload-schema";
import { LEAD_COLUMNS, type Lead } from "@/lib/leads/queries";
import { resolveOrgCredential } from "@/lib/credentials/resolve-org-credential";
import { evaluateLeadForSpam } from "@/lib/ai/spam-shield";
import { sendNewLeadNotification } from "@/lib/email/notify-new-lead";
import { SPAM_FLAG_PREFIX } from "@/lib/leads/spam-review";

type IngestResult = { leadId: string };

type LogEntry = {
  lead_id: string;
  organization_id: string;
  log_type: "WEBHOOK" | "SYSTEM_ALERT";
  content: string;
};

// Resurrection Engine: an inbound webhook for an email that already exists
// as an archived lead reactivates it (rather than being rejected or creating
// a duplicate, which unique_tenant_client_email would reject anyway) and
// flags it with a SYSTEM_ALERT log entry — the durable record a future UI
// can key off of to render a "[Returned Prospect]" badge.
export async function ingestWebhookLead(
  organizationId: string,
  payload: ValidatedWebhookPayload,
): Promise<IngestResult> {
  const supabase = createWebhookServiceClient();

  const { data: existing, error: lookupError } = await supabase
    .from("leads")
    .select("id, archived")
    .eq("organization_id", organizationId)
    .eq("email", payload.email)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const mutableFields = {
    client_name: payload.client_name,
    phone: payload.phone ?? null,
    company: payload.company ?? null,
    website: payload.website ?? null,
    physical_address: payload.physical_address ?? null,
    service_category: payload.service_category ?? null,
    lead_source: payload.lead_source ?? null,
  };

  let lead: Lead;
  let wasReactivated = false;

  if (existing) {
    const isReactivation = existing.archived;
    const { data: updated, error: updateError } = await supabase
      .from("leads")
      .update({
        ...mutableFields,
        ...(isReactivation ? { archived: false, status: "NEW" } : {}),
      })
      .eq("id", existing.id)
      .select(LEAD_COLUMNS)
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    lead = updated;
    wasReactivated = isReactivation;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("leads")
      .insert({
        organization_id: organizationId,
        email: payload.email,
        status: "NEW",
        ...mutableFields,
      })
      .select(LEAD_COLUMNS)
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    lead = inserted;
  }

  const ingestionLogs: LogEntry[] = [
    {
      lead_id: lead.id,
      organization_id: organizationId,
      log_type: "WEBHOOK",
      content: JSON.stringify({ ...payload }),
    },
  ];

  if (wasReactivated) {
    ingestionLogs.push({
      lead_id: lead.id,
      organization_id: organizationId,
      log_type: "SYSTEM_ALERT",
      content: "[Returned Prospect] Lead resubmitted via webhook while archived — reactivated to NEW.",
    });
  }

  const { error: logError } = await supabase.from("activity_logs").insert(ingestionLogs);

  if (logError) {
    throw new Error(logError.message);
  }

  await runSpamShieldAndNotify(supabase, organizationId, lead, payload);

  return { leadId: lead.id };
}

// AI Spam Shield pass, run after the lead is safely persisted. Business-risk
// decision (per Prompt 12's spec): fail OPEN on any unavailability — no
// credential configured, Gemini errors, or a timeout all let the lead
// through as verified rather than silently dropping a real sales lead. Each
// fail-open case is recorded via a SYSTEM_ALERT log so it's visible for
// review, not just silently swallowed.
async function runSpamShieldAndNotify(
  supabase: ReturnType<typeof createWebhookServiceClient>,
  organizationId: string,
  lead: Lead,
  payload: ValidatedWebhookPayload,
): Promise<void> {
  const { value: apiKey } = await resolveOrgCredential(organizationId, "api_key_gemini");

  // spamReason is set ONLY by a genuine spam verdict — never by a fail-open
  // case. A fail-open still writes its own SYSTEM_ALERT for visibility, but it
  // must not put a scary "possible spam" banner on a lead the shield never
  // actually judged.
  let spamReason: string | null = null;
  let alertContent: string | null = null;

  if (!apiKey) {
    alertContent =
      "AI Spam Shield skipped — no Gemini credential configured (org or platform). Lead let through automatically.";
  } else {
    try {
      const verdict = await evaluateLeadForSpam(
        { clientName: payload.client_name, email: payload.email, message: payload.message },
        apiKey,
      );
      if (!verdict.verified) {
        spamReason = verdict.reasoning;
        // SPAM_FLAG_PREFIX is shared with the reader in lib/leads/spam-review.ts
        // so the two can't drift — the queue finds a flag by this exact prefix.
        alertContent = `${SPAM_FLAG_PREFIX}${verdict.reasoning}`;
      }
    } catch (err) {
      alertContent = `AI Spam Shield check failed (${err instanceof Error ? err.message : "unknown error"}) — failing open, lead let through automatically.`;
    }
  }

  // A spam verdict ROUTES a lead, it does not disappear one. This previously
  // set archived: true, which did two things at once and both were wrong: it
  // hid the lead from every list query (all of which filter archived = false)
  // AND suppressed the notification below — so a false positive cost a real
  // customer, silently, with no surface anywhere to review it. The verdict now
  // lives solely in the SYSTEM_ALERT written below, which the Needs Review
  // queue on Today's Agenda reads. See lib/leads/spam-review.ts.

  if (alertContent) {
    const { error } = await supabase.from("activity_logs").insert({
      lead_id: lead.id,
      organization_id: organizationId,
      log_type: "SYSTEM_ALERT",
      content: alertContent,
    } satisfies LogEntry);
    if (error) {
      console.error(`[ingestWebhookLead] failed to write Spam Shield SYSTEM_ALERT for lead ${lead.id}:`, error);
    }
  }

  // Every ingested lead notifies exactly once, flagged or not — the flag rides
  // along in the subject and body so it stays triageable at a glance. Nobody
  // can review a queue they were never told existed.
  //
  // Still fire-and-forget: a notification failure must never fail the webhook
  // response — the lead is already safely in the database by this point. Per
  // the no-queue/no-retry constraint, a failure leaves a logged marker only.
  try {
    await sendNewLeadNotification(organizationId, lead, spamReason);
  } catch (err) {
    console.error(`[ingestWebhookLead] sendNewLeadNotification threw for lead ${lead.id}:`, err);
  }
}
