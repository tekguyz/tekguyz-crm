import type { Lead } from "@/lib/leads/queries";
import type { TaskDue } from "@/lib/tasks/queries";

// STATIC FIXTURE for the Today comps — Today redesign, Stage 1.
// Nothing here is fetched, seeded, written or read. No Server Action, no
// Supabase query, no migration.
//
// SIZED TO THE TEKGUYZ DEMO ORG: 20 leads and 6 tasks, the scale the prompt
// names, because the whole layout question is "does all four sections fit in
// one viewport at demo scale". A smaller fixture would answer it falsely.
//
// PURPOSE-BUILT, NOT A DUMP OF THE DEMO ORG — the same reason
// preview/mock-pipeline.ts gives. The demo tenant's leads all read overdue, so
// every card would render in the Going Cold state and the ordinary one would
// never appear; and all four stages have to be present or the stage-tone
// mapping this prompt exists to wire is never seen doing anything.
//
// THE THREE LANES OVERLAP ON PURPOSE. In the real page they are three
// different filters over ONE lead table, so a lead can be overdue and
// high-value and starred at once and appear three times. deriveLanes() below
// reproduces each query's real predicate rather than hand-assigning leads to
// lanes, so the duplication in the comp is the duplication the real page has.
//
// PLAIN MODULE, no directive — a "use client" file's constants arrive as
// nothing in a Server Component (see CLAUDE.md § Build discipline).
// `import type` only, so no server module is reachable from a comp bundle.

// DATES ARE RELATIVE TO TODAY, NOT LITERALS — mock-pipeline.ts's rule, and it
// matters more here: SLA Critical's membership IS the overdue test, so a
// literal date would quietly move leads between lanes as the file aged.
// Anchored to UTC midnight so the server render and the client hydration
// compute the same instant. No offset is 0, so no card's cold state can flip
// between the two renders during the day.
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

// The cap, in a plain module so the lanes (client) and the tests both read one
// number. FOUR, not the Kanban board's ten: this page puts four sections on
// one screen instead of one board on it, and the prompt's floor is that demo
// scale and a near-empty org both fit one viewport with nothing needing a
// scroll to be discovered. Measured at 1440x800 inside TodayFrame — see
// ../page.tsx for the per-variant numbers.
export const LANE_CARD_CAP = 4;

type Row = [
  name: string,
  company: string | null,
  revenue: number,
  dueInDays: number,
  starred: boolean,
  status: string,
];

// Twenty leads. The spread is deliberate on every axis the card renders:
// all four stages, cold and not-cold, starred and not, a null company, a $0
// estimate, and a very long name and company so the width check has something
// to squeeze.
const ROWS: Row[] = [
  ["Denise Okafor", "BrightWave Solar", 18500, -3, true, "NEW"],
  ["Marcus Rivera", "RiverStone Roofing Co.", 42000, -1, false, "NEW"],
  ["Melissa Trent", "Trent Family HVAC", 31500, -5, true, "QUOTED"],
  ["Carlos Ruiz", "Ruiz Electric", 22000, -2, true, "DISCOVERY"],
  ["Derek Walsh", "Walsh Property Management", 16500, -4, false, "DISCOVERY"],
  ["Kevin O'Neill", "Harbor Point Marina", 15400, -6, false, "NEW"],
  ["Ray Albers", "Albers Pool & Spa", 12600, -1, false, "ACTIVE"],
  ["Priscilla Vandermeer-Holloway", "Holloway Custom Cabinetry & Millwork", 27500, -7, true, "ACTIVE"],
  ["Chloe Martin", "Martin Interiors", 38000, 11, true, "ACTIVE"],
  ["Nina Kowalski", "Kowalski Law", 20500, 15, false, "ACTIVE"],
  ["Amanda Chu", "GreenScape Landscaping", 6200, 2, true, "NEW"],
  ["Ivy Tran", null, 3900, 2, true, "DISCOVERY"],
  ["Fatima Noor", "Noor Pediatrics", 9400, 9, true, "QUOTED"],
  ["Sam Patel", "Patel Dental Group", 12000, 3, false, "NEW"],
  ["Elijah Grant", "Grant Brewing Co.", 14800, 5, false, "QUOTED"],
  ["Nate Sullivan", "Sullivan Fence & Deck", 11200, 7, false, "DISCOVERY"],
  ["Jordan Whitfield", "Whitfield & Sons Plumbing", 9800, 4, false, "NEW"],
  ["Rosa Delgado", "Delgado Bakery", 0, 5, false, "NEW"],
  ["Lena Fischer", "Fischer Physio", 4300, 8, false, "NEW"],
  ["Grace Kim", "Kim & Park CPAs", 5600, 12, false, "QUOTED"],
];

export const MOCK_TODAY_LEADS: Lead[] = ROWS.map(
  ([client_name, company, estimated_revenue, dueInDays, is_starred, status], i) => ({
    id: `00000000-0000-4000-8000-${String(500 + i).padStart(12, "0")}`,
    client_name,
    company,
    email: `${client_name.split(" ")[0].toLowerCase()}@example.com`,
    phone: null,
    website: null,
    physical_address: null,
    social_google_business: null,
    social_facebook: null,
    social_instagram: null,
    lead_source: null,
    service_category: null,
    estimated_revenue,
    status,
    outcome: null,
    actual_revenue: null,
    next_action_at: at(dueInDays, 14 + (i % 6)),
    is_starred,
    ai_brief: null,
    archived: false,
    assigned_to: null,
  }),
);

// Six tasks, the demo org's count. One overdue, so the task row's own overdue
// treatment is exercised; one with a long title for the width check.
const TASK_ROWS: [title: string, leadIndex: number, dueInDays: number][] = [
  ["Send revised quote", 2, -2],
  ["Confirm site measurements before the crew is booked", 0, -1],
  ["Call back re: financing", 4, 1],
  ["Email the panel spec sheet", 1, 2],
  ["Book the follow-up walkthrough", 8, 3],
  ["Chase the signed contract", 9, 6],
];

export const MOCK_TASKS_DUE: TaskDue[] = TASK_ROWS.map(([title, leadIndex, dueInDays], i) => ({
  id: `00000000-0000-4000-8000-${String(600 + i).padStart(12, "0")}`,
  title,
  due_at: at(dueInDays, 15),
  lead_id: MOCK_TODAY_LEADS[leadIndex].id,
  client_name: MOCK_TODAY_LEADS[leadIndex].client_name,
}));

// THE REAL PREDICATES, NOT A HAND-ASSIGNMENT. Each of these mirrors the
// matching query in src/lib/leads/queries.ts — same filter, same sort, same
// limit — so the comp ranks the same leads the shipped page would rank and the
// lanes overlap exactly as much as they really do.
//
// This is also where the SLA Critical question becomes visible: its predicate
// is `next_action_at < now`, which is the SAME test isOverdue() makes for
// Going Cold. Every card in that lane is therefore cold by construction. See
// ../page.tsx for the fork that falls out of it.
export function deriveLanes(leads: Lead[] = MOCK_TODAY_LEADS) {
  const now = Date.now();
  const byDue = (a: Lead, b: Lead) =>
    new Date(a.next_action_at!).getTime() - new Date(b.next_action_at!).getTime();

  return {
    // getSlaCriticalLeads: overdue, soonest first.
    sla: leads.filter((l) => new Date(l.next_action_at!).getTime() < now).sort(byDue),
    // getHighValueLeads: revenue desc, limit 10.
    highValue: [...leads].sort((a, b) => b.estimated_revenue - a.estimated_revenue).slice(0, 10),
    // getStarredLeads: starred, soonest first.
    starred: leads.filter((l) => l.is_starred).sort(byDue),
  };
}

// THE OTHER HALF OF THE VIEWPORT CLAIM. The prompt's floor is that demo scale
// AND a near-empty real org both render inside one viewport with nothing
// needing a scroll to be discovered. Demo scale is the twenty leads above; this
// is the other end, and it is the shape of the LIVE TEKGUYZ org rather than an
// invented one: two leads, both NEW, both on time, neither starred.
//
// It is the harder case for a lane layout, not the easier one. Three lanes of
// two cards each, one of them empty (nothing is starred, so Starred prints its
// empty copy), is where a design that only looks right when full falls over.
export const MOCK_SPARSE_LEADS: Lead[] = [
  {
    ...MOCK_TODAY_LEADS[0],
    id: "00000000-0000-4000-8000-000000000901",
    client_name: "Alder & Finch Joinery",
    company: "Alder & Finch Joinery Ltd",
    estimated_revenue: 8200,
    status: "NEW",
    is_starred: false,
    next_action_at: at(3, 15),
  },
  {
    ...MOCK_TODAY_LEADS[0],
    id: "00000000-0000-4000-8000-000000000902",
    client_name: "Tom Beckett",
    company: null,
    estimated_revenue: 2600,
    status: "NEW",
    is_starred: false,
    next_action_at: at(6, 15),
  },
];

export const MOCK_SPARSE_TASKS: TaskDue[] = [
  {
    id: "00000000-0000-4000-8000-000000000910",
    title: "Send the intro pack",
    due_at: at(2, 15),
    lead_id: MOCK_SPARSE_LEADS[0].id,
    client_name: MOCK_SPARSE_LEADS[0].client_name,
  },
];

// The three scales the comp routes can be viewed at, so `?scale=` has one
// source of truth and the tests read the same map the pages do.
export const SCALES = {
  demo: { leads: MOCK_TODAY_LEADS, tasks: MOCK_TASKS_DUE },
  sparse: { leads: MOCK_SPARSE_LEADS, tasks: MOCK_SPARSE_TASKS },
  empty: { leads: [] as Lead[], tasks: [] as TaskDue[] },
} as const;

export type ScaleName = keyof typeof SCALES;

export function resolveScale(value: string | undefined): ScaleName {
  return value === "sparse" || value === "empty" ? value : "demo";
}
