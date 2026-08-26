// The prospect status vocabulary, in one place.
//
// It lives here rather than in prospect-actions.ts because a "use server" file
// may only export async functions — exporting a plain array from one fails the
// production build with "A 'use server' file can only export object", and it
// fails at page-data collection, not at typecheck. The Server Action imports
// this module like any other consumer.
//
// CONVERTED is deliberately ABSENT from the operator list. It is a real value
// of check_valid_prospect_status, but it is not one a human may select: every
// write that sets status = 'CONVERTED' must set promoted_lead_id in the same
// statement, and only the promotion path does that. A dropdown that could set
// it would produce a prospect claiming to be converted while pointing at no
// lead — exactly the split truth this feature exists to prevent.
export const OPERATOR_PROSPECT_STATUSES = [
  "NEW",
  "CALLED",
  "CALLBACK",
  "NOT_INTERESTED",
] as const;

export type OperatorProspectStatus = (typeof OPERATOR_PROSPECT_STATUSES)[number];

export function isOperatorStatus(value: string): value is OperatorProspectStatus {
  return (OPERATOR_PROSPECT_STATUSES as readonly string[]).includes(value);
}

// Every status a prospect can hold, including CONVERTED, which is displayed but
// never selected. One map so a label can never drift between the row's dropdown,
// the filter and the badge.
export const PROSPECT_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CALLED: "Called",
  CALLBACK: "Callback",
  NOT_INTERESTED: "Not interested",
  CONVERTED: "Converted",
};

export function prospectStatusLabel(status: string): string {
  return PROSPECT_STATUS_LABELS[status] ?? status;
}
