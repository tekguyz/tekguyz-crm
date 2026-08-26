import { createAdminClient } from "./clients";
import { DEMO_ORG_NAME } from "./demo-org";

// Fixture prospects for "TEKGUYZ Demo", so /prospects and the Promote flow have
// something to render during dev-login browser verification.
//
// EVERY ROW IS OBVIOUSLY SYNTHETIC, and that is a requirement, not a style
// choice. A real leadgen scrape lands in the REAL TEKGUYZ tenant, and 122 real
// rows already live there. Fixtures that looked structurally like scraped data
// would eventually be mistaken for it. So:
//   - place_id is `demo-place-####`. A real Google Place ID starts "ChIJ" and
//     is 27 opaque characters; nothing here could be confused for one.
//   - every business name is transparently invented ("Fake Falls Plumbing").
//   - every phone is in the 555-01xx block, reserved for fiction.
//   - websites are on .invalid, the reserved never-resolves TLD (RFC 2606).
//
// No row is seeded as CONVERTED. status='CONVERTED' is only ever legitimate
// alongside a promoted_lead_id written in the same statement, and promotion is
// the thing this fixture exists to let a human exercise by hand.

type DemoProspect = {
  place_id: string;
  name: string;
  category: string;
  address: string | null;
  city: string;
  state: string;
  postal_code: string | null;
  phone: string | null;
  website_url: string | null;
  website_status: string;
  rating: number | null;
  review_count: number | null;
  niche_searched: string;
  city_searched: string;
  status: string;
  notes: string | null;
  archived: boolean;
};

export const DEMO_PROSPECTS: DemoProspect[] = [
  {
    place_id: "demo-place-0001",
    name: "Fake Falls Plumbing",
    category: "Plumber",
    address: "101 Invented Way",
    city: "Fort Worth",
    state: "TX",
    postal_code: "76102",
    phone: "(817) 555-0101",
    website_url: null,
    website_status: "NO_WEBSITE",
    rating: 4.7,
    review_count: 63,
    niche_searched: "plumber",
    city_searched: "Fort Worth, TX",
    status: "NEW",
    notes: null,
    archived: false,
  },
  {
    place_id: "demo-place-0002",
    name: "Notional Nook Roofing",
    category: "Roofing contractor",
    address: "202 Pretend Parkway",
    city: "Arlington",
    state: "TX",
    postal_code: "76010",
    phone: "(817) 555-0102",
    website_url: "https://notional-nook.invalid",
    website_status: "HAS_WEBSITE",
    rating: 4.1,
    review_count: 21,
    niche_searched: "roofing",
    city_searched: "Arlington, TX",
    status: "CALLED",
    notes: "Left a voicemail Tuesday. No callback yet.",
    archived: false,
  },
  {
    place_id: "demo-place-0003",
    name: "Placeholder Pest Control",
    category: "Pest control service",
    address: null,
    city: "Dallas",
    state: "TX",
    postal_code: null,
    // Mobile-only business: no address at all. Real scrapes produce these, and
    // the address composition in the Promote modal has to survive one.
    phone: "(214) 555-0103",
    website_url: null,
    website_status: "NO_WEBSITE",
    rating: null,
    review_count: null,
    niche_searched: "pest control",
    city_searched: "Dallas, TX",
    status: "CALLBACK",
    notes: "Owner is Sam. Asked me to call back Thursday after 4pm.",
    archived: false,
  },
  {
    place_id: "demo-place-0004",
    name: "Imaginary Ice HVAC",
    category: "HVAC contractor",
    address: "404 Nowhere Boulevard",
    city: "Plano",
    state: "TX",
    postal_code: "75024",
    phone: "(972) 555-0104",
    website_url: "https://imaginary-ice.invalid",
    website_status: "HAS_WEBSITE",
    rating: 3.4,
    review_count: 8,
    niche_searched: "hvac",
    city_searched: "Plano, TX",
    status: "NOT_INTERESTED",
    notes: "Already has an agency on retainer. Do not call again.",
    archived: false,
  },
  {
    place_id: "demo-place-0005",
    name: "Sample Street Electric",
    category: "Electrician",
    address: "505 Sample Street",
    city: "Irving",
    state: "TX",
    postal_code: "75038",
    // No phone at all. 5 of the 122 real rows have none either, and the row
    // must still render without a tel: link rather than an empty one.
    phone: null,
    website_url: null,
    website_status: "NO_WEBSITE",
    rating: 4.9,
    review_count: 112,
    niche_searched: "electrician",
    city_searched: "Irving, TX",
    status: "NEW",
    notes: null,
    archived: false,
  },
  {
    place_id: "demo-place-0006",
    name: "Pretend Pines Landscaping",
    category: "Landscaper",
    address: "606 Make Believe Lane",
    city: "Denton",
    state: "TX",
    postal_code: "76201",
    phone: "(940) 555-0106",
    website_url: null,
    website_status: "NO_WEBSITE",
    rating: 4.3,
    review_count: 37,
    niche_searched: "landscaping",
    city_searched: "Denton, TX",
    status: "NEW",
    notes: null,
    archived: false,
  },
  {
    place_id: "demo-place-0007",
    name: "Dummy Drive Dental",
    category: "Dentist",
    address: "707 Dummy Drive",
    city: "Frisco",
    state: "TX",
    postal_code: "75034",
    phone: "(469) 555-0107",
    website_url: "https://dummy-drive-dental.invalid",
    website_status: "HAS_WEBSITE",
    rating: 4.6,
    review_count: 204,
    niche_searched: "dentist",
    city_searched: "Frisco, TX",
    // Archived: the retirement lever, so the Archived filter has something to
    // show and the default view is provably filtering rather than empty.
    status: "NOT_INTERESTED",
    notes: "Out of business as of last month.",
    archived: true,
  },
];

export async function countDemoProspects(orgId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if (error) throw new Error(`Failed to count demo prospects: ${error.message}`);
  return count ?? 0;
}

export async function seedDemoProspects(orgId: string): Promise<number> {
  const admin = createAdminClient();

  const rows = DEMO_PROSPECTS.map((prospect) => ({
    organization_id: orgId,
    ...prospect,
  }));

  // Plain insert, not the import_prospects_chunk RPC: that function is
  // SECURITY DEFINER and re-checks organization_members for auth.uid(), and a
  // service-role JWT resolves auth.uid() to NULL — it would raise
  // PROSPECT_IMPORT_NOT_AUTHORIZED. Seeding is a service-role job by design, so
  // it writes the table directly, exactly as seedDemoLeads writes leads.
  const { error } = await admin.from("prospects").insert(rows);
  if (error) throw new Error(`Failed to insert demo prospects: ${error.message}`);

  return rows.length;
}

// Same name-verified safety check as wipeDemoLeads: refuse to touch anything
// unless this id genuinely resolves to the demo org.
export async function wipeDemoProspects(orgId: string): Promise<number> {
  const admin = createAdminClient();

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .single();

  if (orgError || !org) {
    throw new Error(
      `Refusing to wipe prospects: could not verify org ${orgId} (${orgError?.message ?? "not found"})`,
    );
  }
  if (org.name !== DEMO_ORG_NAME) {
    throw new Error(
      `Refusing to wipe prospects: org ${orgId} is named "${org.name}", not "${DEMO_ORG_NAME}".`,
    );
  }

  const existing = await countDemoProspects(orgId);
  if (existing === 0) return 0;

  const { error } = await admin.from("prospects").delete().eq("organization_id", orgId);
  if (error) throw new Error(`Failed to delete demo prospects: ${error.message}`);

  return existing;
}
