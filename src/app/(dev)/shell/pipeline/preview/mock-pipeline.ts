import type { TeamMember } from "@/lib/invites/queries";
import type { Lead } from "@/lib/leads/queries";

// STATIC FIXTURE for the pipeline-card comps — Shell/IA Stage 1, prompt 3 of 4.
// Nothing here is fetched, seeded, written or read.
//
// PURPOSE-BUILT, NOT A DUMP OF THE DEMO ORG. The demo tenant's 16 leads all
// read overdue, so rendering them would show every card in the Going Cold
// state and never show the ordinary one — the comp would be judged in one
// state only. The live TEKGUYZ org has 2 leads, both NEW, which exercises
// nothing. This fixture deliberately mixes, per column: cold and not-cold,
// starred and not, assigned and not. It also carries the sparse edges a real
// tenant will hit: no company, a $0 estimate, a very long name and company,
// and an assignee who has since left the org.
//
// PLAIN MODULE, no directive — same reason as detail/preview/mock-lead.ts: a
// "use client" file's constants arrive as nothing in a Server Component.
// `import type` only, so no server module is reachable from a comp bundle.

// DATES ARE RELATIVE TO TODAY, NOT LITERALS. A literal future date silently
// turns cold a few days after this file is written, and the comp would then
// quietly lose the not-cold treatment it exists to show. Anchored to UTC
// midnight so the server render and the client hydration compute the same
// instant (a `Date.now()` anchor would differ by the milliseconds between
// them and fail hydration on every formatted date). No offset is 0, so no
// card's cold state can flip between the two renders during the day.
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const TODAY_UTC = (() => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
})();

function at(days: number, hourUtc: number): string {
  return new Date(TODAY_UTC + days * DAY_MS + hourUtc * HOUR_MS).toISOString();
}

export const MOCK_TIMEZONE = "America/New_York";
export const MOCK_CURRENCY = "USD";

const ALEJANDRO = "00000000-0000-4000-8000-00000000a001";
const PRIYA = "00000000-0000-4000-8000-00000000a002";
// Deliberately NOT in MOCK_MEMBERS: AssigneeLabel renders "Former member" for
// an id it cannot resolve, and that string is the longest thing the assignee
// slot will ever carry.
const FORMER = "00000000-0000-4000-8000-00000000a0ff";

export const MOCK_MEMBERS: TeamMember[] = [
  { user_id: ALEJANDRO, email: "alejandro@tekguyz.example", role: "OWNER" },
  { user_id: PRIYA, email: "priya@tekguyz.example", role: "MEMBER" },
];

type Row = [
  name: string,
  company: string | null,
  revenue: number,
  dueInDays: number,
  starred: boolean,
  assignedTo: string | null,
];

function build(status: string, rows: Row[], idBase: number): Lead[] {
  return rows.map(([name, company, revenue, dueInDays, starred, assignedTo], i) => ({
    id: `00000000-0000-4000-8000-${String(idBase + i).padStart(12, "0")}`,
    client_name: name,
    company,
    email: `${name.split(" ")[0].toLowerCase()}@example.com`,
    phone: null,
    website: null,
    physical_address: null,
    social_google_business: null,
    social_facebook: null,
    social_instagram: null,
    lead_source: null,
    service_category: null,
    estimated_revenue: revenue,
    status,
    outcome: null,
    actual_revenue: null,
    next_action_at: at(dueInDays, 14 + (i % 6)),
    is_starred: starred,
    ai_brief: null,
    archived: false,
    assigned_to: assignedTo,
  }));
}

// NEW carries 14 so the column overflows the 10-card cap by four and the
// "+N more" control is exercised. The other three stay under it, so the board
// also shows what a column looks like when the control is absent.
export const MOCK_PIPELINE_LEADS: Lead[] = [
  ...build(
    "NEW",
    [
      ["Denise Okafor", "BrightWave Solar", 18500, -3, true, ALEJANDRO],
      ["Marcus Rivera", "RiverStone Roofing Co.", 42000, -1, false, null],
      ["Amanda Chu", "GreenScape Landscaping", 6200, 2, true, PRIYA],
      ["Tyler Brooks", null, 1500, 1, false, null],
      ["Jordan Whitfield", "Whitfield & Sons Plumbing", 9800, 4, false, ALEJANDRO],
      ["Priscilla Vandermeer-Holloway", "Holloway Custom Cabinetry & Millwork", 27500, 6, true, null],
      ["Sam Patel", "Patel Dental Group", 12000, 3, false, PRIYA],
      ["Rosa Delgado", "Delgado Bakery", 0, 5, false, null],
      ["Kevin O'Neill", "Harbor Point Marina", 15400, -6, false, FORMER],
      ["Lena Fischer", "Fischer Physio", 4300, 8, false, null],
      ["Omar Haddad", null, 7700, 10, false, ALEJANDRO],
      ["Grace Kim", "Kim & Park CPAs", 5600, 12, false, null],
      ["Victor Mendes", "Mendes Auto Body", 3200, 14, false, PRIYA],
      ["Hannah Brooks", "Lakeside Yoga Studio", 2400, 20, false, null],
    ],
    100,
  ),
  ...build(
    "DISCOVERY",
    [
      ["Carlos Ruiz", "Ruiz Electric", 22000, -2, true, ALEJANDRO],
      ["Bethany Cole", "Cole Family Dentistry", 8900, 3, false, PRIYA],
      ["Nate Sullivan", "Sullivan Fence & Deck", 11200, 7, false, null],
      ["Ivy Tran", null, 3900, 2, true, null],
      ["Derek Walsh", "Walsh Property Management", 16500, -4, false, PRIYA],
    ],
    200,
  ),
  ...build(
    "QUOTED",
    [
      ["Melissa Trent", "Trent Family HVAC", 31500, -5, true, ALEJANDRO],
      ["Elijah Grant", "Grant Brewing Co.", 14800, 5, false, null],
      ["Fatima Noor", "Noor Pediatrics", 9400, 9, true, PRIYA],
      ["Paul Jensen", "Jensen Tree Service", 6700, 1, false, FORMER],
    ],
    300,
  ),
  ...build(
    "ACTIVE",
    [
      ["Chloe Martin", "Martin Interiors", 38000, 11, true, ALEJANDRO],
      ["Ray Albers", "Albers Pool & Spa", 12600, -1, false, null],
      ["Nina Kowalski", "Kowalski Law", 20500, 15, false, PRIYA],
    ],
    400,
  ),
];

// The overflow cap, in a plain module so the board (client) and the tests
// both read one number. Ten because the Kanban Reorder Rule already ranks a
// column overdue → starred → revenue → soonest, so the first ten are the ones
// that matter most; the control is for reaching the rest, not a new ranking.
export const COLUMN_CARD_CAP = 10;
