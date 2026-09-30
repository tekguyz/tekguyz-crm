"use server";

import { revalidatePath } from "next/cache";
import { isDemoSession } from "@/lib/demo/demo-block";
import { DEMO_BLOCK_MESSAGE } from "@/lib/demo/demo-block-message";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";
import { validatedRowSchema, type ValidatedRow } from "@/lib/validation/csv-lead-schema";
import { buildInsertRows } from "@/lib/import/build-insert-rows";
import { clearJunkChannelCells } from "@/lib/import/channel-cells";
import {
  insertLeadChunks,
  listSkippedRows,
  logImportedLeads,
  summarizeOutcomes,
  type SkippedRow,
} from "@/lib/import/insert-chunks";

export type BatchInsertResult = {
  imported: number;
  intraFileDuplicates: number;
  existingDuplicates: number;
  existingActive: number;
  existingArchived: number;
  failedChunks: number;
  failedChunkRows: number;
  // Every row that did not import, and why, by its place in the rows sent.
  skippedRows: SkippedRow[];
  error?: string;
};

const emptyResult = (): BatchInsertResult => ({
  imported: 0,
  intraFileDuplicates: 0,
  existingDuplicates: 0,
  existingActive: 0,
  existingArchived: 0,
  failedChunks: 0,
  failedChunkRows: 0,
  skippedRows: [],
});

export async function batchInsertLeads(rows: ValidatedRow[]): Promise<BatchInsertResult> {
  // organization_id comes from the caller's own session, never the payload,
  // and is handed to insertLeadChunks explicitly. The client below stays the
  // session-bound one (NOT admin.ts, which would bypass RLS entirely), so the
  // JWT reaches the database and auth.uid() resolves.
  //
  // The chunk write itself runs inside a SECURITY DEFINER RPC, which
  // bypasses RLS — so on that one path the tenant boundary is the RPC's own
  // membership re-check, not the "Members create tenant leads" WITH CHECK
  // policy. Every other statement in this action still goes through RLS.
  // Demo Block: nobody fills the database through the demo.
  if (await isDemoSession()) return { ...emptyResult(), error: DEMO_BLOCK_MESSAGE };

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
  // row it had itself just produced. Junk link cells are emptied first, the
  // same way validateRows does on the client.
  const revalidated: ValidatedRow[] = [];
  const sentIndex: number[] = [];
  const refused: SkippedRow[] = [];

  rows.forEach((row, index) => {
    const parsed = validatedRowSchema.safeParse(clearJunkChannelCells(row).row);
    if (parsed.success) {
      revalidated.push(parsed.data);
      sentIndex.push(index);
    } else {
      refused.push({ index, kind: "REJECTED", reason: "SERVER_RECHECK" });
    }
  });

  // No duplicate check here, in the file or against the CRM: the RPC does
  // both, row by row, on every Contact Channel. See insertLeadChunks.
  const insertRows = buildInsertRows(revalidated, orgId);
  const { outcomes, failedChunks, failedChunkRows } = await insertLeadChunks(supabase, orgId, insertRows);
  const summary = summarizeOutcomes(outcomes);

  // Each new lead's first lead_submissions row is written inside the RPC, in
  // the same transaction as the lead. Only the audit log is written here.
  if (summary.insertedIds.length > 0) {
    await logImportedLeads(supabase, orgId, summary.insertedIds);
  }

  revalidatePath("/", "layout");

  return {
    imported: summary.insertedIds.length,
    intraFileDuplicates: summary.intraFileDuplicates,
    existingDuplicates: summary.existingActive + summary.existingArchived,
    existingActive: summary.existingActive,
    existingArchived: summary.existingArchived,
    failedChunks,
    failedChunkRows,
    skippedRows: [...refused, ...listSkippedRows(outcomes, sentIndex)].sort((a, b) => a.index - b.index),
  };
}
