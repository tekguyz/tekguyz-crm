import type { Lead } from "@/lib/leads/queries";

// STATIC FIXTURE. Nothing here is fetched, seeded, written or read — Stage 1
// comps render over mock data only, the same constraint Prompt 1 worked under.
//
// IN A PLAIN MODULE ON PURPOSE, for the reason frames.ts spells out: a
// "use client" file's plain constants are replaced by client-reference proxies
// and arrive as nothing in a Server Component. Both the variant pages (server)
// and their panels (client) import from here, so it must carry no directive.
//
// `import type` only. src/lib/leads/queries.ts pulls in the Supabase server
// client; a type import is erased at compile time, so no server module is ever
// reachable from a comp bundle. The type is imported rather than restated so
// that a future column rename fails this file at `tsc` instead of quietly
// leaving the comp describing a schema that no longer exists.
export const MOCK_LEAD: Lead = {
  id: "00000000-0000-4000-8000-000000000001",
  client_name: "Melissa Trent",
  company: "Trent Family HVAC",
  email: "melissa@trentfamilyhvac.example",
  phone: "+15550142288",
  website: "https://trentfamilyhvac.example",
  physical_address: "418 Halstead Ave, Riverton",
  social_google_business: null,
  social_facebook: null,
  social_instagram: null,
  lead_source: "Google Ads",
  service_category: "HVAC",
  estimated_revenue: 31500,
  status: "QUOTED",
  outcome: null,
  actual_revenue: null,
  // Deliberately in the past, so every variant is judged with the Going Cold
  // SLA signal switched ON rather than in the easy case.
  next_action_at: "2026-09-06T13:00:00.000Z",
  is_starred: true,
  ai_brief:
    "Commercial rooftop unit replacement for a small retail plaza. Job accepted and materials ordered. Slipped past its last check-in date waiting on the equipment delivery — worth confirming the new ETA directly with the supplier, not just the customer.",
  archived: false,
  assigned_to: null,
};

// Local shapes, not the real Task / LeadSubmission / ActivityLog types. Those
// live beside Server Actions this comp must never reach, and a comp only needs
// the fields it paints. Restating four fields is cheaper than dragging a
// server module into a dev-only bundle to satisfy a type.
export type MockTask = {
  id: string;
  title: string;
  due: string;
  completed: boolean;
};

export const MOCK_TASKS: MockTask[] = [
  { id: "t1", title: "Confirm new delivery ETA with the supplier", due: "Sep 9, 1:00 PM", completed: false },
  { id: "t2", title: "Send revised install window to Melissa", due: "Sep 10, 9:00 AM", completed: false },
  { id: "t3", title: "Chase deposit invoice", due: "Sep 11, 4:30 PM", completed: false },
  { id: "t4", title: "Site measure booked and confirmed", due: "Sep 2, 11:00 AM", completed: true },
];

export type MockSubmission = {
  id: string;
  at: string;
  source: string;
  message: string;
  category: string | null;
};

export const MOCK_SUBMISSIONS: MockSubmission[] = [
  {
    id: "s2",
    at: "Aug 28, 2026, 9:04 AM",
    source: "Website form",
    message: "Following up — are we still on for the rooftop unit? Happy to sign whatever you need.",
    category: "HVAC",
  },
  {
    id: "s1",
    at: "Aug 17, 2026, 1:51 PM",
    source: "Google Ads",
    message: "Rooftop unit down at our retail plaza, need a replacement quoted ASAP.",
    category: "HVAC",
  },
];

export type MockActivity = {
  id: string;
  at: string;
  author: string;
  body: string;
};

export const MOCK_ACTIVITY: MockActivity[] = [
  { id: "a3", at: "Sep 5, 4:12 PM", author: "Alejandro", body: "Supplier says the unit ships Monday. Told Melissa Tuesday to be safe." },
  { id: "a2", at: "Aug 30, 10:20 AM", author: "Alejandro", body: "Quote accepted over the phone. Deposit invoice raised." },
  { id: "a1", at: "Aug 17, 1:52 PM", author: "System", body: "Lead captured from the website contact form." },
];
