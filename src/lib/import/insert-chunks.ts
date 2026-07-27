import type { SupabaseClient } from "@supabase/supabase-js";
import type { InsertRow } from "@/lib/import/dedup";

const CHUNK_SIZE = 250;

export type ChunkedInsertResult = {
  insertedIds: string[];
  skippedEmails: string[];
  failedChunks: number;
  failedChunkRows: number;
};

export async function insertLeadChunks(
  supabase: SupabaseClient,
  rows: InsertRow[],
): Promise<ChunkedInsertResult> {
  const result: ChunkedInsertResult = {
    insertedIds: [],
    skippedEmails: [],
    failedChunks: 0,
    failedChunkRows: 0,
  };

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    try {
      const { data: inserted, error } = await supabase
        .from("leads")
        .upsert(chunk, { onConflict: "organization_id,email", ignoreDuplicates: true })
        .select("id, email");

      if (error) throw new Error(error.message);

      // Diff the chunk against what actually came back, rather than
      // pre-querying for existing emails — a pre-query is a TOCTOU race
      // across chunks, whereas the upsert's own returned rows are atomic
      // with the write. Anything missing was skipped as a duplicate.
      const insertedEmails = new Set((inserted ?? []).map((row) => row.email as string));

      for (const row of chunk) {
        if (!insertedEmails.has(row.email)) result.skippedEmails.push(row.email);
      }
      result.insertedIds.push(...(inserted ?? []).map((row) => row.id as string));
    } catch (err) {
      // One bad chunk must not abort the rest of the batch — record it and
      // keep going, so a transient failure costs 250 rows, not the import.
      result.failedChunks += 1;
      result.failedChunkRows += chunk.length;
      console.error(
        `[insertLeadChunks] chunk starting at row ${i} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return result;
}

export async function logImportedLeads(
  supabase: SupabaseClient,
  organizationId: string,
  leadIds: string[],
): Promise<void> {
  // SYSTEM_ALERT is reused deliberately — it's already an accepted value in
  // activity_logs' check_valid_log_type (re-confirmed live), and the message
  // text carries the distinction, so no migration is needed for this.
  const logs = leadIds.map((leadId) => ({
    lead_id: leadId,
    organization_id: organizationId,
    log_type: "SYSTEM_ALERT",
    content: "Lead created via CSV import.",
  }));

  for (let i = 0; i < logs.length; i += CHUNK_SIZE) {
    const { error } = await supabase.from("activity_logs").insert(logs.slice(i, i + CHUNK_SIZE));
    if (error) {
      // The leads themselves are already committed; a missing audit-log row
      // must not fail the import or roll anything back.
      console.error(`[logImportedLeads] log chunk at ${i} failed:`, error.message);
    }
  }
}
