// Shared translation layer for the one database error the leads write paths
// can now raise on a permission grounds rather than a data grounds:
// trigger_enforce_lead_role_restrictions rejecting a MEMBER's attempt to
// archive a lead or change how it closed (migration
// 20260814120000_leads_member_role_enforcement.sql).
//
// Lives in its own module because all three affected write paths need it and
// they are already split across two files (actions.ts and archive-actions.ts,
// separated on 2026-07-28 for the 200-line cap) — a copy in each is exactly
// the drift this project's file-split rule warns about.

// Matched on the message, not on the SQLSTATE alone. PostgREST reports a plain
// RLS denial with the same 42501 as this trigger's explicit RAISE, so code
// alone would relabel an ordinary cross-tenant denial as a role problem. The
// prefix is written into the RAISE in the migration; keep the two in sync.
const LEAD_ROLE_DENIED_SENTINEL = "LEAD_ROLE_DENIED";

// What the user actually reads. The raw Postgres string never reaches the UI.
export const LEAD_ROLE_DENIED_MESSAGE =
  "Only an owner or admin can archive a lead or change how it closed. Ask an owner or admin to make this change.";

export function isLeadRoleDenied(error: unknown): boolean {
  return hasSentinel(error, LEAD_ROLE_DENIED_SENTINEL);
}

// The second such error, added with leads.assigned_to on 2026-08-18:
// trigger_enforce_lead_assignee_membership rejecting an attempt to assign a
// lead to somebody who is not a member of that lead's organization (migration
// 20260818120000_leads_assigned_to.sql).
//
// Distinct from the one above on both axes on purpose. It is a data-integrity
// violation rather than a permission one, so the trigger raises 23514 rather
// than 42501 — and it applies to every role equally, since assignment itself
// has full OWNER/ADMIN/MEMBER parity. In normal use it is unreachable: the
// picker only ever offers real members of the current org. It exists for the
// paths the picker does not cover — a stale form, a direct API call, or a
// service-role script.
const LEAD_ASSIGNEE_NOT_MEMBER_SENTINEL = "LEAD_ASSIGNEE_NOT_MEMBER";

export const LEAD_ASSIGNEE_NOT_MEMBER_MESSAGE =
  "That person is no longer a member of this organization, so the lead cannot be assigned to them. Pick someone else, or leave it unassigned.";

export function isLeadAssigneeNotMember(error: unknown): boolean {
  return hasSentinel(error, LEAD_ASSIGNEE_NOT_MEMBER_SENTINEL);
}

function hasSentinel(error: unknown, sentinel: string): boolean {
  if (!error || typeof error !== "object") return false;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.includes(sentinel);
}
