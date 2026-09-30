import type { ValidatedRow } from "@/lib/validation/csv-lead-schema";

const DAY_MS = 24 * 60 * 60 * 1000;
const PREFERRED_STAGGER_MS = 15 * 60 * 1000;
const MAX_SPREAD_MS = 7 * DAY_MS;

export const CSV_IMPORT_SOURCE = "CSV Import";

// Staggers next_action_at instead of letting every row inherit the same
// NOW() + 24h default — otherwise a 400-row import dumps the whole batch
// into SLA Critical at the same instant 24h later, which breaks the "Going
// Cold" mechanic rather than just looking untidy. Large batches compress the
// step so the spread stays inside MAX_SPREAD_MS instead of piling the tail
// up against a hard cap (which would recreate the clustering it prevents).
export function buildInsertRows(rows: ValidatedRow[], organizationId: string) {
  const base = Date.now() + DAY_MS;
  const step =
    rows.length > 1
      ? Math.min(PREFERRED_STAGGER_MS, MAX_SPREAD_MS / (rows.length - 1))
      : PREFERRED_STAGGER_MS;

  return rows.map((row, index) => ({
    organization_id: organizationId,
    client_name: row.client_name,
    email: row.email,
    company: row.company,
    phone: row.phone,
    website: row.website,
    physical_address: row.physical_address,
    social_google_business: row.social_google_business,
    social_facebook: row.social_facebook,
    social_instagram: row.social_instagram,
    social_whatsapp: row.social_whatsapp,
    service_category: row.service_category,
    ai_brief: row.ai_brief,
    estimated_revenue: row.estimated_revenue,
    // The file's own value when it has one (a Lead Pack says google-maps,
    // facebook-group, facebook or instagram). Every other ingestion path
    // records its origin implicitly (webhook payload shape, seed script); this
    // is bulk import's fallback.
    lead_source: row.lead_source ?? CSV_IMPORT_SOURCE,
    status: "NEW",
    next_action_at: new Date(base + index * step).toISOString(),
  }));
}

export type InsertRow = ReturnType<typeof buildInsertRows>[number];
