import { createClient } from "@/lib/supabase/server";

/**
 * The invite gate for account creation.
 *
 * Account creation in this product is invite-only: there is no self-serve
 * signup, no billing model behind one, and the only accounts that will ever
 * exist are provisioned by the owner. `/signup` therefore refuses to render a
 * form — and `signUp` refuses to run — without a token that names a live
 * PENDING invite.
 *
 * This module is deliberately NOT a "use server" file (such a file may only
 * export async functions) and is deliberately shared by both the page and the
 * action. Hiding the form is presentation; the action re-running this check is
 * the actual boundary, because a Server Action is POST-able directly.
 */

export type InvitePreview = {
  organization_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

export type InviteGate =
  | { ok: true; email: string; organizationName: string; role: string }
  | { ok: false; reason: string };

/**
 * The verdict itself, pure and clock-injected so it is testable without a
 * database. Every refusal returns the same opaque wording on purpose: a
 * stranger guessing tokens learns nothing about which ones exist.
 */
export function evaluateInvitePreview(
  invite: InvitePreview | null,
  now: Date = new Date(),
): InviteGate {
  const REFUSAL = "This invite link is not valid.";

  if (!invite) return { ok: false, reason: REFUSAL };
  if (invite.status !== "PENDING") return { ok: false, reason: REFUSAL };
  if (new Date(invite.expires_at).getTime() < now.getTime()) {
    return { ok: false, reason: REFUSAL };
  }

  return {
    ok: true,
    email: invite.email.toLowerCase(),
    organizationName: invite.organization_name,
    role: invite.role,
  };
}

/** Resolves a raw token string through the anon-callable preview RPC. */
export async function checkInviteToken(token: string | undefined): Promise<InviteGate> {
  if (!token) return { ok: false, reason: "This invite link is not valid." };

  const supabase = await createClient();
  const { data, error } = (await supabase
    .rpc("get_invite_preview", { p_token: token })
    .maybeSingle()) as { data: InvitePreview | null; error: unknown };

  if (error) return { ok: false, reason: "This invite link is not valid." };
  return evaluateInvitePreview(data);
}
