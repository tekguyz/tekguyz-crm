"use server";

import { revalidatePath } from "next/cache";

import { isOperatorStatus } from "@/lib/prospects/statuses";
import { createClient } from "@/lib/supabase/server";

// Inline edits for a single prospect row on /prospects.
//
// A NEW file. prospect-import-actions.ts and import-actions.ts are untouched.
//
// These take plain typed arguments rather than FormData on purpose. There is no
// form here — a status dropdown that saves on change, a notes box that saves on
// blur, an archive button — so there is no form/action field set to drift apart,
// and CLAUDE.md § Form/Action Field Parity has nothing to catch. The Promote
// modal IS a form and does go through FormData; see prospect-promote-actions.ts.
//
// Tenant isolation is the "Members write tenant prospects" RLS policy's paired
// USING/WITH CHECK, not a filter written here: a prospect id from another
// organization simply updates zero rows. No organization_id is accepted from
// the caller anywhere in this file.

export type ProspectEditState = { error?: string } | null;

export async function setProspectStatus(
  prospectId: string,
  status: string,
): Promise<ProspectEditState> {
  // Re-validated server-side even though the dropdown only offers these four:
  // a Server Action is a public HTTP endpoint, same reasoning as
  // importProspects re-parsing rows the client already validated.
  if (!isOperatorStatus(status)) {
    return { error: "That is not a status you can set here." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("prospects")
    .update({ status })
    // Belt and braces on top of RLS: even a caller who somehow reached a
    // promoted prospect must not be able to walk its status back off CONVERTED
    // while promoted_lead_id still points at a real lead.
    .eq("id", prospectId)
    .is("promoted_lead_id", null);

  if (error) return { error: error.message };

  revalidatePath("/prospects");
  return null;
}

export async function setProspectNotes(
  prospectId: string,
  notes: string,
): Promise<ProspectEditState> {
  const trimmed = notes.trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("prospects")
    // Empty stores as NULL, never as "". An honest absence, same rule the CSV
    // import applies to every blank cell it reads.
    .update({ notes: trimmed || null })
    .eq("id", prospectId);

  if (error) return { error: error.message };

  revalidatePath("/prospects");
  return null;
}

// `archived` is the retirement lever for a prospect nobody is calling any more.
// There is deliberately no second concept for this and no delete: public
// .prospects grants no DELETE to authenticated and has no DELETE policy, so a
// hard delete is not reachable from the app at all.
export async function setProspectArchived(
  prospectId: string,
  archived: boolean,
): Promise<ProspectEditState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prospects")
    .update({ archived })
    .eq("id", prospectId);

  if (error) return { error: error.message };

  revalidatePath("/prospects");
  return null;
}
