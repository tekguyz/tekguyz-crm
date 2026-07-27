"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";
import { validatedRowSchema, type ValidatedRow } from "@/lib/validation/csv-lead-schema";
import { dedupeByEmail, buildInsertRows } from "@/lib/import/dedup";
import { insertLeadChunks, logImportedLeads } from "@/lib/import/insert-chunks";
import { reportDuplicateBreakdown } from "@/lib/import/report-duplicates";

export type BatchInsertResult = {
  imported: number;
  intraFileDuplicates: number;
  existingDuplicates: number;
  existingActive: number;
  existingArchived: number;
  rejectedServerSide: number;
  failedChunks: number;
  failedChunkRows: number;
  error?: string;
};

const emptyResult = (): BatchInsertResult => ({
  imported: 0,
  intraFileDuplicates: 0,
  existingDuplicates: 0,
  existingActive: 0,
  existingArchived: 0,
  rejectedServerSide: 0,
  failedChunks: 0,
  failedChunkRows: 0,
});

export async function batchInsertLeads(rows: ValidatedRow[]): Promise<BatchInsertResult> {
  // organization_id comes from the caller's own session, never the payload.
  // Combined with the session-bound client below (NOT admin.ts, which would
  // bypass RLS entirely), the "Members create tenant leads" WITH CHECK
  // policy is a real enforcement boundary rather than a formality.
  const { orgId } = await getCurrentOrg();
  const supabase = await createClient();

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ...emptyResult(), error: "No rows were submitted." };
  }

  // Re-validated server-side even though the client already validated these
  // rows: a Server Action is a public HTTP endpoint, so the client's
  // pass/fail split is a UI convenience, not a trust boundary. Uses
  // validatedRowSchema (the post-transform shape) rather than csvLeadSchema
  // (raw CSV strings) — the latter isn't idempotent and would reject every
  // row it had itself just produced.
  const revalidated: ValidatedRow[] = [];
  let rejectedServerSide = 0;

  for (const row of rows) {
    const parsed = validatedRowSchema.safeParse(row);
    if (parsed.success) revalidated.push(parsed.data);
    else rejectedServerSide += 1;
  }

  const { unique, intraFileDuplicates } = dedupeByEmail(revalidated);
  const insertRows = buildInsertRows(unique, orgId);

  const { insertedIds, skippedEmails, failedChunks, failedChunkRows } = await insertLeadChunks(
    supabase,
    insertRows,
  );

  if (insertedIds.length > 0) {
    await logImportedLeads(supabase, orgId, insertedIds);
  }

  const breakdown = await reportDuplicateBreakdown(supabase, orgId, skippedEmails);

  revalidatePath("/", "layout");

  return {
    imported: insertedIds.length,
    intraFileDuplicates,
    existingDuplicates: skippedEmails.length,
    existingActive: breakdown.active,
    existingArchived: breakdown.archived,
    rejectedServerSide,
    failedChunks,
    failedChunkRows,
  };
}
