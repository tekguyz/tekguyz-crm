// THE REAL EDIT FORM'S FIELD SET, as a static fixture — added 2026-09-12 on
// review feedback, and it exists to answer one question the other three
// variants cannot: does the scrolling go away?
//
// The three container comps carry six fields (prompt 3's trimmed set) so that
// the CONTAINERS were comparable. That was the right call for that question
// and the wrong fixture for this one: the review's complaint about the shipped
// form is "too narrow, and I always have to scroll to the bottom", and six
// fields in an 800px window never scroll no matter what you put them in. So
// this fixture carries all eighteen.
//
// EIGHTEEN, COUNTED FROM THE REAL FILES, NOT GUESSED — the five groups under
// src/components/leads/edit-modal/ that share EditLeadModal's one <form>:
//
//   IdentityFields      client_name, email, phone, company, website,
//                       lead_source, service_category                     (7)
//   PipelineFields      status, estimated_revenue, next_action_at,
//                       is_starred                                        (4)
//   AssignmentField     assigned_to                                       (1)
//   AddressSocialFields physical_address, social_google_business,
//                       social_facebook, social_instagram                 (4)
//   OutcomeFields       outcome, actual_revenue                           (2)
//
// STILL A COMP. Nothing here is fetched, seeded, written or read, and no
// Server Action is reachable from any file in this directory. The labels and
// the options are copied from those five files so the comp is measured against
// real content lengths, but this is NOT a parity list and must never be used
// as one — Stage 2 still owes its own diff of the form's `name=` set against
// `updateLead`'s `formData.get()` set, in both directions, against the real
// files. See CLAUDE.md § Form/Action Field Parity.
//
// PLAIN MODULE, no directive: the server page and the client body both read it.

export type FullLeadFormValues = {
  // Identity
  client_name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  lead_source: string;
  service_category: string;
  // Pipeline
  status: string;
  estimated_revenue: string;
  next_action_at: string;
  is_starred: boolean;
  assigned_to: string;
  // Address and socials
  physical_address: string;
  social_google_business: string;
  social_facebook: string;
  social_instagram: string;
  // Outcome
  outcome: string;
  actual_revenue: string;
};

export const EMPTY_FULL_FORM: FullLeadFormValues = {
  client_name: "",
  email: "",
  phone: "",
  company: "",
  website: "",
  lead_source: "",
  service_category: "",
  status: "NEW",
  estimated_revenue: "",
  next_action_at: "",
  is_starred: false,
  assigned_to: "",
  physical_address: "",
  social_google_business: "",
  social_facebook: "",
  social_instagram: "",
  outcome: "",
  actual_revenue: "",
};

export const MOCK_FULL_FORM: FullLeadFormValues = {
  client_name: "Melissa Trent",
  email: "melissa@trentfamilyhvac.example",
  phone: "+15550142288",
  company: "Trent Family HVAC",
  website: "https://trentfamilyhvac.example",
  lead_source: "Google Ads",
  service_category: "HVAC",
  status: "QUOTED",
  estimated_revenue: "31500",
  next_action_at: "2026-09-06T13:00",
  is_starred: true,
  assigned_to: "00000000-0000-4000-8000-00000000a001",
  physical_address: "418 Halstead Ave, Riverton",
  social_google_business: "https://g.page/trent-family-hvac",
  social_facebook: "https://facebook.com/trentfamilyhvac",
  social_instagram: "https://instagram.com/trentfamilyhvac",
  outcome: "",
  actual_revenue: "",
};

// The stress case, for scripts/check-comp-text-widths.mjs. Long everywhere a
// real tenant plausibly goes long, including three full social URLs — which
// are the values most likely to blow out a two-column grid.
export const MOCK_FULL_FORM_LONG: FullLeadFormValues = {
  client_name: "Priscilla Vandermeer-Holloway",
  email: "priscilla.vandermeer-holloway@hollowaycabinetry.example",
  phone: "+1 (555) 0142-288 ext. 4471",
  company: "Holloway Custom Cabinetry & Millwork Incorporated",
  website: "https://www.hollowaycustomcabinetryandmillwork.example",
  lead_source: "Referral — Riverton Chamber of Commerce",
  service_category: "Custom millwork and cabinetry installation",
  status: "ACTIVE",
  estimated_revenue: "1275000",
  next_action_at: "2026-12-31T23:45",
  is_starred: true,
  // Not in MOCK_FORM_MEMBERS — "Former member" is the longest assignee label.
  assigned_to: "00000000-0000-4000-8000-00000000a0ff",
  physical_address:
    "Unit 14B, Holloway Works, 1180 Northgate Industrial Parkway, Riverton, Maharashtra 400066",
  social_google_business: "https://g.page/holloway-custom-cabinetry-and-millwork-riverton",
  social_facebook: "https://facebook.com/hollowaycustomcabinetryandmillwork",
  social_instagram: "https://instagram.com/hollowaycustomcabinetryandmillwork",
  outcome: "WON",
  actual_revenue: "1189500",
};

// The four groups, in the order the shipped form composes them, with the one
// change this comp is testing: the two groups an operator touches on most
// edits are open, and the two they rarely touch start collapsed.
//
// THAT IS THE "COLLAPSE THE NOISE" PROPOSAL, and it is a proposal, not a fact.
// Which groups deserve to be open is a judgement about how this workspace
// actually works, and it is exactly the thing the review should push back on.
export type FullFormSectionId = "identity" | "pipeline" | "reach" | "outcome";

export const FULL_FORM_SECTIONS: {
  id: FullFormSectionId;
  label: string;
  fields: number;
  openByDefault: boolean;
  why: string;
}[] = [
  {
    id: "identity",
    label: "Identity",
    fields: 7,
    openByDefault: true,
    why: "Who the lead is. Touched on almost every edit.",
  },
  {
    id: "pipeline",
    label: "Pipeline",
    fields: 5,
    openByDefault: true,
    why: "Stage, value, the Going Cold date and who owns it. The working fields.",
  },
  {
    id: "reach",
    label: "Address & social profiles",
    fields: 4,
    openByDefault: false,
    why: "Captured once, rarely corrected. Four long URLs that dominate the form for no daily benefit.",
  },
  {
    id: "outcome",
    label: "Outcome",
    fields: 2,
    openByDefault: false,
    why: "Only meaningful when a lead closes, and OWNER/ADMIN-only in the real app.",
  },
];
