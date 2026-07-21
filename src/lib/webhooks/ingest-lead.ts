import "server-only";
import { createWebhookServiceClient } from "@/lib/supabase/service-role";
import type { ValidatedWebhookPayload } from "@/lib/validation/webhook-payload-schema";

type IngestResult = { leadId: string };

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

  let leadId: string;
  let wasReactivated = false;

  if (existing) {
    const isReactivation = existing.archived;
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        ...mutableFields,
        ...(isReactivation ? { archived: false, status: "NEW" } : {}),
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    leadId = existing.id;
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
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    leadId = inserted.id;
  }

  type LogEntry = {
    lead_id: string;
    organization_id: string;
    log_type: "WEBHOOK" | "SYSTEM_ALERT";
    content: string;
  };

  const logEntries: LogEntry[] = [
    {
      lead_id: leadId,
      organization_id: organizationId,
      log_type: "WEBHOOK",
      content: JSON.stringify({ ...payload }),
    },
  ];

  if (wasReactivated) {
    logEntries.push({
      lead_id: leadId,
      organization_id: organizationId,
      log_type: "SYSTEM_ALERT",
      content: "[Returned Prospect] Lead resubmitted via webhook while archived — reactivated to NEW.",
    });
  }

  const { error: logError } = await supabase.from("activity_logs").insert(logEntries);

  if (logError) {
    throw new Error(logError.message);
  }

  return { leadId };
}
