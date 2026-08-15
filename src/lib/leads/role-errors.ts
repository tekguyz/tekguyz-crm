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
  if (!error || typeof error !== "object") return false;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.includes(LEAD_ROLE_DENIED_SENTINEL);
}
