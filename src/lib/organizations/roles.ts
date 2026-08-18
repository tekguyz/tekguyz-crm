// The three membership roles, and the single question the UI asks about them.
//
// The database is the real boundary: trigger_enforce_lead_role_restrictions
// rejects a MEMBER writing archived / outcome / actual_revenue / closed_at, and
// the Server Actions turn that rejection into readable copy. This helper only
// decides whether it is worth SHOWING a control that would be rejected — it
// never replaces the trigger, and nothing here is load-bearing for security.
export type OrgRole = "OWNER" | "ADMIN" | "MEMBER";

// archived / outcome / actual_revenue / closed_at — the four lead columns the
// BEFORE UPDATE trigger reserves for OWNER and ADMIN.
export function canEditLeadLifecycle(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}
