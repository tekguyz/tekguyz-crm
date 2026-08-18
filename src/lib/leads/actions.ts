"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";
import { getAllContacts, getLeadById, type ContactLead, type Lead } from "@/lib/leads/queries";
import {
  isLeadAssigneeNotMember,
  isLeadRoleDenied,
  LEAD_ASSIGNEE_NOT_MEMBER_MESSAGE,
  LEAD_ROLE_DENIED_MESSAGE,
} from "@/lib/leads/role-errors";
import { recordLeadSubmission } from "@/lib/submissions/record";

// NOTE: archiveLead / unarchiveLead live in @/lib/leads/archive-actions.ts,
// split out on 2026-07-28 to bring this file back under the 200-line cap.
// Deliberately NOT re-exported from here — EditLeadModal was their only
// caller, so importing them directly from the new module leaves one touch
// point and no indirection to keep in sync.

export type LeadFormState = { error?: string } | null;

export async function createLead(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const clientName = String(formData.get("client_name") ?? "").trim();
  // Lowercased so it matches the DB's case-insensitive unique index
  // (unique_tenant_client_email_ci) and every other ingestion path (CSV
  // import, webhook) — same single-field fix, no lookup here to mismatch
  // since this always inserts and lets the constraint reject a collision.
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!clientName || !email) {
    return { error: "Client name and email are required." };
  }

  const estimatedRevenueRaw = formData.get("estimated_revenue");
  const estimatedRevenue = estimatedRevenueRaw ? Number(estimatedRevenueRaw) : 0;

  const { orgId } = await getCurrentOrg();
  const supabase = await createClient();

  // Read once, then reused for both the leads row and its first submission —
  // so the two can never disagree about what was entered. Every name here has
  // a rendered <input name="..."> in CreateLeadModal; nothing new is read from
  // formData by the submission write (CLAUDE.md § Form/Action Field Parity).
  const phone = optionalField(formData.get("phone"));
  const company = optionalField(formData.get("company"));
  const website = optionalField(formData.get("website"));
  const leadSource = optionalField(formData.get("lead_source"));
  const serviceCategory = optionalField(formData.get("service_category"));

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      organization_id: orgId,
      client_name: clientName,
      email,
      phone,
      company,
      website,
      lead_source: leadSource,
      service_category: serviceCategory,
      estimated_revenue: estimatedRevenue,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Every lead carries at least one submission from day one, whatever created
  // it — otherwise the profile sheet's enquiry history would be empty for
  // manually-created leads and read as "nothing was ever received" rather than
  // "this one was typed in". message is null: this form has no message field,
  // and inventing one would be a fake record of something nobody said.
  await recordLeadSubmission(supabase, {
    leadId: lead.id,
    organizationId: orgId,
    clientName,
    email,
    phone,
    company,
    message: null,
    serviceCategory,
    leadSource,
  });

  revalidatePath("/", "layout");
  return null;
}

// formData.get returns FormDataEntryValue | null; an untouched text input
// yields "" rather than null, and both must store as NULL.
function optionalField(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

const VALID_OUTCOMES = new Set(["WON", "LOST", "ABANDONED"]);

export async function updateLead(
  leadId: string,
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const clientName = String(formData.get("client_name") ?? "").trim();
  // Lowercased for the same reason as createLead — this function looks up
  // the existing row by id (not email), so there's no lookup/write mismatch
  // to fix here, only the stored value's casing.
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!clientName || !email) {
    return { error: "Client name and email are required." };
  }

  const outcomeRaw = String(formData.get("outcome") ?? "");
  const outcome = VALID_OUTCOMES.has(outcomeRaw) ? outcomeRaw : null;

  const estimatedRevenueRaw = formData.get("estimated_revenue");
  const estimatedRevenue = estimatedRevenueRaw ? Number(estimatedRevenueRaw) : 0;
  const actualRevenueRaw = formData.get("actual_revenue");
  const actualRevenue = actualRevenueRaw ? Number(actualRevenueRaw) : null;

  // Submitted as a full ISO string by EditLeadModal, converted client-side
  // from the datetime-local input's local-timezone value — the server never
  // has to guess a runtime timezone to interpret it correctly.
  const nextActionAtRaw = String(formData.get("next_action_at") ?? "");
  if (!nextActionAtRaw || Number.isNaN(Date.parse(nextActionAtRaw))) {
    return { error: "Invalid follow-up date." };
  }

  const supabase = await createClient();

  // Only stamp closed_at the first time an outcome is set, not on every edit.
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("closed_at")
    .eq("id", leadId)
    .single();

  if (fetchError) {
    return { error: fetchError.message };
  }

  const closedAt = outcome ? (existing.closed_at ?? new Date().toISOString()) : null;

  const { error } = await supabase
    .from("leads")
    .update({
      client_name: clientName,
      email,
      phone: formData.get("phone") || null,
      company: formData.get("company") || null,
      website: formData.get("website") || null,
      physical_address: formData.get("physical_address") || null,
      social_google_business: formData.get("social_google_business") || null,
      social_facebook: formData.get("social_facebook") || null,
      social_instagram: formData.get("social_instagram") || null,
      lead_source: formData.get("lead_source") || null,
      service_category: formData.get("service_category") || null,
      estimated_revenue: estimatedRevenue,
      status: String(formData.get("status") ?? "NEW"),
      outcome,
      actual_revenue: outcome ? actualRevenue : null,
      closed_at: closedAt,
      is_starred: formData.get("is_starred") === "on",
      next_action_at: nextActionAtRaw,
      // Rendered by AssignmentField as <select name="assigned_to">, whose
      // "Unassigned" option carries value="" — optionalField turns that back
      // into NULL (Form/Action Field Parity: the select is always present, so
      // this is never a silent NULL of a value the user could not see).
      // Full role parity: deliberately no OWNER/ADMIN gate here or on the
      // field. The database still checks the assignee is a member of this
      // lead's org — see the error branch below.
      assigned_to: optionalField(formData.get("assigned_to")),
    })
    .eq("id", leadId);

  // A MEMBER hitting the role trigger gets the plain-language reason, not the
  // raw Postgres string. This form always re-sends outcome/actual_revenue/
  // closed_at, so a MEMBER only lands here when one of them actually changed —
  // the trigger's IS DISTINCT FROM guard lets an unchanged re-send through.
  //
  // The assignee trigger is translated the same way, and for the same reason.
  // It fires when a picked member was removed from the org between the modal
  // opening and the save landing — rare, but the raw "LEAD_ASSIGNEE_NOT_MEMBER:"
  // string is not something a user should ever read.
  if (error) {
    return { error: translateLeadWriteError(error) };
  }

  revalidatePath("/", "layout");
  return null;
}

function translateLeadWriteError(error: { message: string }): string {
  if (isLeadRoleDenied(error)) return LEAD_ROLE_DENIED_MESSAGE;
  if (isLeadAssigneeNotMember(error)) return LEAD_ASSIGNEE_NOT_MEMBER_MESSAGE;
  return error.message;
}

const VALID_STATUSES = new Set(["NEW", "DISCOVERY", "QUOTED", "ACTIVE"]);

// Only called on cross-column Kanban drops — same-column drag never calls this,
// so there is no "order" field to write here, only status. See the Kanban
// Reorder Rule in CLAUDE.md.
export async function updateLeadStatus(leadId: string, status: string): Promise<void> {
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);

  if (error) throw error;

  revalidatePath("/", "layout");
}

// Client-callable boundary for the CMD+K Command Bar — reuses the same
// tenant-wide "every contact regardless of outcome" pool as the Contacts
// directory (Prompt 6), since a global search should be able to find any
// contact, not just ones currently active in the pipeline.
export async function fetchSearchableContacts(): Promise<ContactLead[]> {
  const { orgId } = await getCurrentOrg();
  return getAllContacts(orgId);
}

// Client-callable boundary for ProfileSheetController's ?leadId= deep link
// (e.g. from a Resend notification email). RLS on the underlying query is
// the actual tenant boundary — a leadId outside the caller's org simply
// resolves to null here, same pattern as addManualNote's lead lookup.
export async function fetchLeadById(leadId: string): Promise<Lead | null> {
  return getLeadById(leadId);
}
