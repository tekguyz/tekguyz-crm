// The three membership roles, and the questions the UI asks about them.
//
// The database is the real boundary: trigger_enforce_lead_role_restrictions
// rejects a MEMBER writing archived / outcome / actual_revenue / closed_at,
// change_member_role and remove_organization_member re-check the caller's role
// inside their own bodies, and the Server Actions turn those rejections into
// readable copy. These helpers only decide whether it is worth SHOWING a
// control that would be rejected — they never replace the database check, and
// nothing here is load-bearing for security.
export type OrgRole = "OWNER" | "ADMIN" | "MEMBER";

// archived / outcome / actual_revenue / closed_at — the four lead columns the
// BEFORE UPDATE trigger reserves for OWNER and ADMIN.
export function canEditLeadLifecycle(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}

// Changing another member's role, and removing another member. Deliberately
// says nothing about leaving an organization: that is allowed for every role
// (remove_organization_member authorises a caller who IS the target), so the
// "Leave organization" control is not gated on this.
export function canManageTeam(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}
