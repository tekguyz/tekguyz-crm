import { createClient } from "@/lib/supabase/server";

export type Lead = {
  id: string;
  client_name: string;
  company: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  lead_source: string | null;
  service_category: string | null;
  estimated_revenue: number;
  status: string;
  outcome: string | null;
  actual_revenue: number | null;
  next_action_at: string;
  is_starred: boolean;
  ai_brief: string | null;
};

const LEAD_COLUMNS =
  "id, client_name, company, email, phone, website, lead_source, service_category, estimated_revenue, status, outcome, actual_revenue, next_action_at, is_starred, ai_brief";

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

export type ContactLead = Lead & {
  physical_address: string | null;
};

const CONTACT_COLUMNS = `${LEAD_COLUMNS}, physical_address`;

// A directory, not a pipeline view — every non-archived contact regardless of
// outcome (WON/LOST/ABANDONED still belong in an address book), sorted
// alphabetically rather than by SLA/revenue like the pipeline queries above.
export async function getAllContacts(orgId: string): Promise<ContactLead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(CONTACT_COLUMNS)
    .eq("organization_id", orgId)
    .eq("archived", false)
    .order("client_name", { ascending: true });

  if (error) throw error;
  return data;
}
