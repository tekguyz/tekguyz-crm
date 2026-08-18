// Translation layer for the errors the two team-management RPCs raise
// (migration 20260818130000_team_management_rpcs.sql).
//
// Same shape and same reasoning as src/lib/leads/role-errors.ts: matched on the
// message sentinel rather than the SQLSTATE alone, because a plain RLS denial
// uses the same 42501 as an explicit RAISE and a CHECK constraint uses the same
// 23514 — code alone would mislabel an unrelated failure as a team-rule
// failure. The prefixes are written into the RAISEs in the migration; keep the
// two in sync.
//
// Every message here is written for a person, not for a log. The raw Postgres
// string never reaches the UI.

const MESSAGES: Record<string, string> = {
  // The last-OWNER invariant. Deliberately tells the user how to get unstuck
  // rather than only what was refused — this one is reachable by ordinary
  // correct use (a one-person org is the common case), unlike the rest.
  TEAM_LAST_OWNER:
    "This is the organization's only owner. Make someone else an owner first, then try again.",
  TEAM_ADMIN_CANNOT_MANAGE_OWNER: "Only an owner can change or remove another owner.",
  TEAM_ADMIN_CANNOT_GRANT_OWNER:
    "Only an owner can make someone else an owner. Ask an owner to do this.",
  TEAM_MEMBER_NOT_FOUND:
    "That person is no longer a member of this organization. Refresh the page.",
  TEAM_INVALID_ROLE: "That is not a valid role.",
  TEAM_NOT_AUTHORIZED: "You do not have permission to do that.",
};

// Ordered longest-first so a sentinel that is a prefix of another can never
// shadow it. Nothing currently overlaps, but the check costs nothing and the
// failure it prevents — the wrong explanation shown confidently — is silent.
const SENTINELS = Object.keys(MESSAGES).sort((a, b) => b.length - a.length);

export const TEAM_FALLBACK_MESSAGE = "Something went wrong. Please try again.";

/**
 * The user-facing reason for a failed team-management call.
 *
 * Falls back to a generic message rather than `error.message`: unlike the lead
 * write paths, every *expected* failure here is enumerated above, so an
 * unrecognised error is a genuine bug rather than something the user can act
 * on. The real error still reaches the server console at the call site.
 */
export function teamErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return TEAM_FALLBACK_MESSAGE;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string") return TEAM_FALLBACK_MESSAGE;

  const hit = SENTINELS.find((sentinel) => message.includes(sentinel));
  return hit ? MESSAGES[hit] : TEAM_FALLBACK_MESSAGE;
}
