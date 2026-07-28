import { createClient } from "@/lib/supabase/server";

export type Lead = {
  id: string;
  client_name: string;
  company: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  physical_address: string | null;
  social_google_business: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  lead_source: string | null;
  service_category: string | null;
  estimated_revenue: number;
  status: string;
  outcome: string | null;
  actual_revenue: number | null;
  next_action_at: string;
  is_starred: boolean;
  ai_brief: string | null;
  archived: boolean;
};

export const LEAD_COLUMNS =
  "id, client_name, company, email, phone, website, physical_address, social_google_business, social_facebook, social_instagram, lead_source, service_category, estimated_revenue, status, outcome, actual_revenue, next_action_at, is_starred, ai_brief, archived";

export async function getSlaCriticalLeads(orgId: string): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("organization_id", orgId)
    .eq("archived", false)
    .is("outcome", null)
    // Instant comparison against "now" — see isOverdue() in lib/format.ts for
    // why this is correct regardless of the org's timezone.
    .lt("next_action_at", new Date().toISOString())
    .order("next_action_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getHighValueLeads(orgId: string, limit = 10): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("organization_id", orgId)
    .eq("archived", false)
    .is("outcome", null)
    .order("estimated_revenue", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getStarredLeads(orgId: string): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("organization_id", orgId)
    .eq("archived", false)
    .is("outcome", null)
    .eq("is_starred", true)
    .order("next_action_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getPipelineLeads(orgId: string): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("organization_id", orgId)
    .eq("archived", false)
    .is("outcome", null);

  if (error) throw error;
  return data;
}

// Scoped by RLS alone (no explicit organization_id filter needed) — used by
// the ?leadId= deep-link controller, where the caller only has an id, not
// the org context a list query would already be filtered by.
export async function getLeadById(leadId: string): Promise<Lead | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("id", leadId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// physical_address now lives on the base Lead type/LEAD_COLUMNS itself (every
// view needs the true current value, not just Contacts — EditLeadModal is
// shared across Pipeline/Agenda/Contacts, and a view that fetched a stale/
// missing value would silently null the field out on save). ContactLead is
// kept as a distinct name since many files already import it by that name,
// but it no longer adds anything on top of Lead.
export type ContactLead = Lead;

const CONTACT_COLUMNS = LEAD_COLUMNS;

// A directory, not a pipeline view — every contact regardless of outcome
// (WON/LOST/ABANDONED still belong in an address book), sorted alphabetically
// rather than by SLA/revenue like the pipeline queries above. `archived`
// toggles between the default "Active" view and the "Archived" filter added
// alongside the in-app Unarchive action — always one or the other, never
// both mixed together, so the view a user is looking at is unambiguous.
export async function getAllContacts(orgId: string, archived = false): Promise<ContactLead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(CONTACT_COLUMNS)
    .eq("organization_id", orgId)
    .eq("archived", archived)
    .order("client_name", { ascending: true });

  if (error) throw error;
  return data;
}
