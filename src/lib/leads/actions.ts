"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";
import { getAllContacts, getLeadById, type ContactLead, type Lead } from "@/lib/leads/queries";

export type LeadFormState = { error?: string } | null;

export async function createLead(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const clientName = String(formData.get("client_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!clientName || !email) {
    return { error: "Client name and email are required." };
  }

  const estimatedRevenueRaw = formData.get("estimated_revenue");
  const estimatedRevenue = estimatedRevenueRaw ? Number(estimatedRevenueRaw) : 0;

  const { orgId } = await getCurrentOrg();
  const supabase = await createClient();

  const { error } = await supabase.from("leads").insert({
    organization_id: orgId,
    client_name: clientName,
    email,
    phone: formData.get("phone") || null,
    company: formData.get("company") || null,
    website: formData.get("website") || null,
    lead_source: formData.get("lead_source") || null,
    service_category: formData.get("service_category") || null,
    estimated_revenue: estimatedRevenue,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return null;
}

const VALID_OUTCOMES = new Set(["WON", "LOST", "ABANDONED"]);

export async function updateLead(
  leadId: string,
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const clientName = String(formData.get("client_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!clientName || !email) {
    return { error: "Client name and email are required." };
  }

  const outcomeRaw = String(formData.get("outcome") ?? "");
  const outcome = VALID_OUTCOMES.has(outcomeRaw) ? outcomeRaw : null;

  const estimatedRevenueRaw = formData.get("estimated_revenue");
  const estimatedRevenue = estimatedRevenueRaw ? Number(estimatedRevenueRaw) : 0;
  const actualRevenueRaw = formData.get("actual_revenue");
  const actualRevenue = actualRevenueRaw ? Number(actualRevenueRaw) : null;

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
      lead_source: formData.get("lead_source") || null,
      service_category: formData.get("service_category") || null,
      estimated_revenue: estimatedRevenue,
      status: String(formData.get("status") ?? "NEW"),
      outcome,
      actual_revenue: outcome ? actualRevenue : null,
      closed_at: closedAt,
      is_starred: formData.get("is_starred") === "on",
    })
    .eq("id", leadId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return null;
}

export async function archiveLead(leadId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("leads").update({ archived: true }).eq("id", leadId);
  revalidatePath("/", "layout");
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
