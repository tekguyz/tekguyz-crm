import { createClient } from "@/lib/supabase/server";

// One row of public.prospects, in the order 20260826120000_prospects.sql
// declares them, plus the two columns 20260826130000_prospects_promotion.sql
// adds at the end.
export type Prospect = {
  id: string;
  place_id: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  website_url: string | null;
  website_status: string | null;
  rating: number | null;
  review_count: number | null;
  google_maps_url: string | null;
  niche_searched: string | null;
  city_searched: string | null;
  scraped_at: string | null;
  phone_digits: string | null;
  status: string;
  // Informational ONLY. A phone-number match against an existing lead, found at
  // import time. It is surfaced as a link so the operator can go look, and it
  // never blocks or gates Promote — a shared switchboard number is a perfectly
  // ordinary reason for two different businesses to collide here.
  possible_duplicate_lead_id: string | null;
  archived: boolean;
  notes: string | null;
  // THE only source of truth for "already promoted". Never read status ===
  // 'CONVERTED' to answer that question: status is a label an operator can set
  // by hand from the dropdown, and it cannot carry the identity of the lead.
  promoted_lead_id: string | null;
  created_at: string;
  updated_at: string;
};

// Same single-string-backs-many-queries shape as LEAD_COLUMNS, and the same
// hazard: PostgREST ERRORS with 42703 on a column the database does not have,
// rather than ignoring it. So this string naming notes/promoted_lead_id before
// 20260826130000_prospects_promotion.sql is applied takes down /prospects
// entirely. Migration lands first, then the code. (CLAUDE.md § Build discipline.)
export const PROSPECT_COLUMNS =
  "id, place_id, name, category, address, city, state, postal_code, phone, website_url, website_status, rating, review_count, google_maps_url, niche_searched, city_searched, scraped_at, phone_digits, status, possible_duplicate_lead_id, archived, notes, promoted_lead_id, created_at, updated_at";

// Tenant isolation is the "Members read tenant prospects" RLS policy, not this
// eq() — the filter is here so the query can use idx_prospects_tenant_status,
// same belt-and-braces shape every leads query uses.
//
// Sorting and text filtering deliberately happen in JS afterwards (see
// lib/prospects/sort.ts), not here: a tenant's prospect list is low hundreds of
// rows, it is already fully fetched to render the table, and pushing sort into
// PostgREST would mean a round trip per column click for no measurable gain.
export async function getProspects(
  orgId: string,
  showArchived = false,
): Promise<Prospect[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospects")
    .select(PROSPECT_COLUMNS)
    .eq("organization_id", orgId)
    .eq("archived", showArchived)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as Prospect[];
}
