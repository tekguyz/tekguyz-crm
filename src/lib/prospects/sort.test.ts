import { describe, expect, it } from "vitest";

import type { Prospect } from "@/lib/prospects/queries";
import { filterProspects, isProspectSortKey, sortProspects } from "@/lib/prospects/sort";

function prospect(overrides: Partial<Prospect>): Prospect {
  return {
    id: "id",
    place_id: "place",
    name: "Name",
    category: null,
    address: null,
    city: null,
    state: null,
    postal_code: null,
    phone: null,
    website_url: null,
    website_status: null,
    rating: null,
    review_count: null,
    google_maps_url: null,
    niche_searched: null,
    city_searched: null,
    scraped_at: null,
    phone_digits: null,
    status: "NEW",
    possible_duplicate_lead_id: null,
    archived: false,
    notes: null,
    promoted_lead_id: null,
    created_at: "2026-08-26T00:00:00Z",
    updated_at: "2026-08-26T00:00:00Z",
    ...overrides,
  };
}

const ROWS = [
  prospect({ id: "b", name: "Beta Roofing", rating: 3.2, city: "Dallas" }),
  prospect({ id: "a", name: "Alpha Plumbing", rating: 4.8, city: "Austin" }),
  prospect({ id: "n", name: "No Rating Co", rating: null, city: null }),
  prospect({ id: "c", name: "Gamma Electric", rating: 4.1, city: "Boston" }),
];

const idsOf = (rows: Prospect[]) => rows.map((row) => row.id);

describe("sortProspects", () => {
  it("sorts text ascending", () => {
    expect(idsOf(sortProspects(ROWS, "name", "asc"))).toEqual(["a", "b", "c", "n"]);
  });

  it("sorts numbers ascending, not as strings", () => {
    // "10" before "9" would prove a string sort. 3.2 < 4.1 < 4.8 here.
    expect(idsOf(sortProspects(ROWS, "rating", "asc"))).toEqual(["b", "c", "a", "n"]);
  });

  it("sorts numbers descending", () => {
    expect(idsOf(sortProspects(ROWS, "rating", "desc"))).toEqual(["a", "c", "b", "n"]);
  });

  // The rule worth a test of its own: a business with no rating is not the
  // worst-rated business. Flipping direction must reorder what can be compared
  // and never promote the unknowns to the top.
  it("keeps nulls last in BOTH directions", () => {
    expect(idsOf(sortProspects(ROWS, "rating", "asc")).at(-1)).toBe("n");
    expect(idsOf(sortProspects(ROWS, "rating", "desc")).at(-1)).toBe("n");
    expect(idsOf(sortProspects(ROWS, "city", "asc")).at(-1)).toBe("n");
    expect(idsOf(sortProspects(ROWS, "city", "desc")).at(-1)).toBe("n");
  });

  it("does not mutate the input array", () => {
    const before = idsOf(ROWS);
    sortProspects(ROWS, "name", "desc");
    expect(idsOf(ROWS)).toEqual(before);
  });
});

describe("filterProspects", () => {
  it("returns everything when nothing is filtered", () => {
    expect(filterProspects(ROWS, {})).toHaveLength(4);
    expect(filterProspects(ROWS, { query: "  ", status: "ALL" })).toHaveLength(4);
  });

  it("matches business name case-insensitively", () => {
    expect(idsOf(filterProspects(ROWS, { query: "alpha" }))).toEqual(["a"]);
  });

  it("matches on city, category, phone and notes too", () => {
    const rows = [
      prospect({ id: "1", name: "X", city: "Plano" }),
      prospect({ id: "2", name: "Y", category: "Roofer" }),
      prospect({ id: "3", name: "Z", phone: "(817) 555-0142" }),
      prospect({ id: "4", name: "W", notes: "call the gatekeeper" }),
    ];
    expect(idsOf(filterProspects(rows, { query: "plano" }))).toEqual(["1"]);
    expect(idsOf(filterProspects(rows, { query: "roof" }))).toEqual(["2"]);
    expect(idsOf(filterProspects(rows, { query: "555-0142" }))).toEqual(["3"]);
    expect(idsOf(filterProspects(rows, { query: "gatekeeper" }))).toEqual(["4"]);
  });

  it("filters by status", () => {
    const rows = [
      prospect({ id: "1", status: "NEW" }),
      prospect({ id: "2", status: "CALLED" }),
    ];
    expect(idsOf(filterProspects(rows, { status: "CALLED" }))).toEqual(["2"]);
  });

  it("combines a status filter with a text query", () => {
    const rows = [
      prospect({ id: "1", name: "Alpha", status: "NEW" }),
      prospect({ id: "2", name: "Alpha", status: "CALLED" }),
      prospect({ id: "3", name: "Beta", status: "CALLED" }),
    ];
    expect(idsOf(filterProspects(rows, { query: "alpha", status: "CALLED" }))).toEqual(["2"]);
  });
});

describe("isProspectSortKey", () => {
  it("accepts a known key and rejects anything else", () => {
    expect(isProspectSortKey("rating")).toBe(true);
    // A URL is user input: ?sort=promoted_lead_id must not become a sort key.
    expect(isProspectSortKey("promoted_lead_id")).toBe(false);
    expect(isProspectSortKey("created_at")).toBe(false);
    expect(isProspectSortKey(undefined)).toBe(false);
  });
});
