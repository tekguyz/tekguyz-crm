import type { ValidatedRow } from "@/lib/validation/csv-lead-schema";

const DAY_MS = 24 * 60 * 60 * 1000;
const PREFERRED_STAGGER_MS = 15 * 60 * 1000;
const MAX_SPREAD_MS = 7 * DAY_MS;

export const CSV_IMPORT_SOURCE = "CSV Import";

// Two rows in the same file sharing an email would collide on
// unique_tenant_client_email *within a single INSERT statement*, which
// upsert's ignoreDuplicates does NOT protect against — that only handles
// conflicts with rows already in the table. So this has to happen before any
// database call. First occurrence wins.
export function dedupeByEmail(rows: ValidatedRow[]): {
  unique: ValidatedRow[];
  intraFileDuplicates: number;
} {
  const seen = new Map<string, ValidatedRow>();
  let intraFileDuplicates = 0;

  for (const row of rows) {
    // Already lowercased by the schema; re-lowering here keeps this function
    // correct on its own terms rather than depending on an upstream promise.
    const key = row.email.toLowerCase();
    if (seen.has(key)) {
      intraFileDuplicates += 1;
      continue;
    }
    seen.set(key, row);
  }

  return { unique: [...seen.values()], intraFileDuplicates };
}

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
    service_category: row.service_category,
    estimated_revenue: row.estimated_revenue,
    // Every other ingestion path records its origin implicitly (webhook
    // payload shape, seed script); this is bulk import's equivalent.
    lead_source: row.lead_source ?? CSV_IMPORT_SOURCE,
    status: "NEW",
    next_action_at: new Date(base + index * step).toISOString(),
  }));
}

export type InsertRow = ReturnType<typeof buildInsertRows>[number];
