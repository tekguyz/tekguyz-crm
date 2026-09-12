import type { TeamMember } from "@/lib/invites/queries";

// STATIC FIXTURE for the lead/contact form comps — Shell/IA Stage 1, prompt
// 4 of 4. Nothing here is fetched, seeded, written or read, and no Server
// Action is reachable from any file in this directory.
//
// PLAIN MODULE, no directive — the same rule pipeline/preview/mock-pipeline.ts
// and detail/preview/mock-lead.ts carry: a "use client" file's plain constants
// are replaced by client-reference proxies and arrive as nothing in a Server
// Component. `import type` only, so no server module is reachable from a comp
// bundle.
//
// THE FIELD SET IS PROMPT 3's TRIMMED SET, NOT THE REAL FORM's.
// Six fields: client_name, company, is_starred, estimated_revenue,
// next_action_at, assigned_to. They are reused rather than re-derived so that
// the card comps and the form comps describe the same lead.
//
// DELIBERATELY NOT PRODUCTION-ACCURATE, and that is a constraint on Stage 2,
// not a licence. The shipped CreateLeadModal posts eight fields — it adds
// email, phone, website, lead_source and service_category — and the shipped
// edit form adds the address/social group, the pipeline group, outcome and
// archive. Stage 2 owes its own Form/Action field-parity diff against the real
// `createLead` / `updateLead`; the completeness of this fixture proves nothing
// about that. See CLAUDE.md § Form/Action Field Parity.

const ALEJANDRO = "00000000-0000-4000-8000-00000000a001";
const PRIYA = "00000000-0000-4000-8000-00000000a002";
// Deliberately absent from MOCK_FORM_MEMBERS, the same trick mock-pipeline.ts
// uses: an assignee the org can no longer resolve is the longest label the
// assignee control will ever carry.
const FORMER = "00000000-0000-4000-8000-00000000a0ff";

export const MOCK_FORM_MEMBERS: TeamMember[] = [
  { user_id: ALEJANDRO, email: "alejandro@tekguyz.example", role: "OWNER" },
  { user_id: PRIYA, email: "priya@tekguyz.example", role: "MEMBER" },
];

export const FORMER_MEMBER_ID = FORMER;

// The six fields as FORM VALUES — strings, because that is what an <input>
// and a FormData entry both hold. Deliberately not the `Lead` row type: a
// form edits text, and pretending otherwise is how a number field ends up
// unable to be emptied.
export type LeadFormValues = {
  client_name: string;
  company: string;
  estimated_revenue: string;
  // `datetime-local` wants "YYYY-MM-DDTHH:mm" with no zone. The real column is
  // a timestamptz; converting between the two is Stage 2's problem and is
  // noted here so nobody reads this string as the stored shape.
  next_action_at: string;
  assigned_to: string;
  is_starred: boolean;
};

export const EMPTY_LEAD_FORM: LeadFormValues = {
  client_name: "",
  company: "",
  estimated_revenue: "",
  next_action_at: "",
  assigned_to: "",
  is_starred: false,
};

// EDIT IS CREATE WITH VALUES IN IT. There is one form component and one
// layout; "edit" is this object handed to it as its starting state. A second
// design for editing is exactly what this prompt was told not to produce.
export const MOCK_LEAD_FORM: LeadFormValues = {
  client_name: "Melissa Trent",
  company: "Trent Family HVAC",
  estimated_revenue: "31500",
  next_action_at: "2026-09-06T13:00",
  assigned_to: ALEJANDRO,
  is_starred: true,
};

// THE STRESS CASE, and it exists for the width check rather than for looks.
// Every value is the longest one a real tenant plausibly produces: a
// double-barrelled name, a company with a suffix, a seven-figure estimate, and
// an assignee who has left the org ("Former member" is the longest string that
// control can render). scripts/check-comp-text-widths.mjs drives the comps
// with this record; the ordinary fixture above would never squeeze anything.
export const MOCK_LEAD_FORM_LONG: LeadFormValues = {
  client_name: "Priscilla Vandermeer-Holloway",
  company: "Holloway Custom Cabinetry & Millwork Incorporated",
  estimated_revenue: "1275000",
  next_action_at: "2026-12-31T23:45",
  assigned_to: FORMER,
  is_starred: true,
};

// Label for an assignee id, including the one the org cannot resolve. Kept
// here rather than reusing components/leads/AssigneeLabel.tsx because that
// component reads the real MembersContext, which a comp has no provider for —
// and wrapping every variant in a fake provider to render one <option> would
// be more machinery than the thing it serves.
export function assigneeOptionLabel(userId: string): string {
  const member = MOCK_FORM_MEMBERS.find((m) => m.user_id === userId);
  if (member) return member.email.split("@")[0];
  return "Former member";
}
