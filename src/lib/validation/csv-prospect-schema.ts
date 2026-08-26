import { z } from "zod";

// The leadgen scrape CSV, validated. Unlike the leads wizard this has NO
// column-mapping step: tekguyz-leadgen writes a fixed header row that this
// project does not get to choose, so the mapping is a constant, not a user
// decision. PROSPECT_CSV_HEADERS below is that header row, copied from the
// real files in C:/Projects/tekguyz-leadgen/output, in order:
//
//   place_id,name,category,address,city,state,postal_code,phone,website_url,
//   website_status,rating,review_count,google_maps_url,niche_searched,
//   city_searched,run_id,scraped_at
//
// A file missing place_id or name is rejected outright rather than partially
// imported — place_id is the dedup key and name is the only other NOT NULL
// column, so without them there is nothing to insert.
export const PROSPECT_CSV_HEADERS = [
  "place_id",
  "name",
  "category",
  "address",
  "city",
  "state",
  "postal_code",
  "phone",
  "website_url",
  "website_status",
  "rating",
  "review_count",
  "google_maps_url",
  "niche_searched",
  "city_searched",
  "run_id",
  "scraped_at",
] as const;

export const REQUIRED_PROSPECT_HEADERS = ["place_id", "name"] as const;

// Blank cells are genuinely common in this data — 5 of the current 122 rows
// have no phone, and a mobile-only business has no address at all. An empty
// string becomes NULL rather than "", so the database stores an honest absence.
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

// The scraper writes plain integers/decimals, but a hand-edited file may carry
// "4.9 stars" or a thousands separator. Anything that still is not a finite
// number after stripping becomes null — a missing rating must never fail a row
// whose phone number is the only part anyone will use.
const optionalNumber = (max?: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) return null;
      const parsed = Number(value.replace(/[^0-9.\-]/g, ""));
      if (!Number.isFinite(parsed)) return null;
      if (max !== undefined && parsed > max) return null;
      if (parsed < 0) return null;
      return parsed;
    });

const optionalTimestamp = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  });

export const csvProspectSchema = z.object({
  // Google's Place ID. Trimmed but NOT lowercased: unlike an email it is a
  // case-sensitive opaque token, and unique_tenant_place_id compares it
  // verbatim. Lowercasing it would break the idempotent re-import this whole
  // table is keyed on.
  place_id: z.string().trim().min(1, "place_id is required"),
  name: z.string().trim().min(1, "name is required"),
  category: optionalText,
  address: optionalText,
  city: optionalText,
  state: optionalText,
  postal_code: optionalText,
  phone: optionalText,
  website_url: optionalText,
  website_status: optionalText,
  // numeric(2,1) in the database — a 0..5 Google star rating. Anything above 5
  // is a parse artefact, not a rating, so it is dropped rather than stored.
  rating: optionalNumber(5),
  review_count: optionalNumber().transform((value) =>
    value === null ? null : Math.round(value),
  ),
  google_maps_url: optionalText,
  niche_searched: optionalText,
  city_searched: optionalText,
  run_id: optionalText,
  scraped_at: optionalTimestamp,
});

export type ValidatedProspectRow = z.infer<typeof csvProspectSchema>;

// The server-side re-check. Same reason batchInsertLeads has one: a Server
// Action is a public HTTP endpoint, so the client's pass/fail split is a UI
// convenience, not a trust boundary. csvProspectSchema is NOT idempotent — it
// parses raw CSV *strings* into a typed shape — so feeding its own output back
// through it would reject every row it had just produced. This validates that
// post-transform shape instead.
const outText = z.string().trim().min(1).nullable().catch(null);
const outNumber = z.number().finite().nonnegative().nullable().catch(null);

export const validatedProspectRowSchema = z.object({
  place_id: z.string().trim().min(1, "place_id is required"),
  name: z.string().trim().min(1, "name is required"),
  category: outText,
  address: outText,
  city: outText,
  state: outText,
  postal_code: outText,
  phone: outText,
  website_url: outText,
  website_status: outText,
  rating: outNumber,
  review_count: outNumber,
  google_maps_url: outText,
  niche_searched: outText,
  city_searched: outText,
  run_id: outText,
  scraped_at: z.string().trim().min(1).nullable().catch(null),
});
