import type { SupabaseClient } from "@supabase/supabase-js";
import type { InsertRow } from "@/lib/import/build-insert-rows";

const CHUNK_SIZE = 250;

// One outcome per row sent, from public.import_leads_chunk
// (20260930120000_muse_lead_pack.sql). rowIndex is the row's position in the
// whole import, not in its chunk. INSERTED: leadId is the new lead. DUPLICATE:
// leadId is the lead it matched, on any Contact Channel, and leadArchived says
// whether that lead is archived. REJECTED: nothing was written; reason says why.
export type RowOutcome = {
  rowIndex: number;
  outcome: "INSERTED" | "DUPLICATE" | "REJECTED";
  leadId: string | null;
  leadArchived: boolean | null;
  reason: string | null;
};

export type ChunkedInsertResult = {
  outcomes: RowOutcome[];
  failedChunks: number;
  failedChunkRows: number;
};

type RpcOutcome = {
  row_index: number;
  outcome: RowOutcome["outcome"];
  lead_id: string | null;
  lead_archived: boolean | null;
  reason: string | null;
};

export async function insertLeadChunks(
  supabase: SupabaseClient,
  organizationId: string,
  rows: InsertRow[],
): Promise<ChunkedInsertResult> {
  const result: ChunkedInsertResult = { outcomes: [], failedChunks: 0, failedChunkRows: 0 };

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    try {
      // A SECURITY DEFINER RPC, not a PostgREST insert: it walks the rows one
      // by one, skips any row that matches an existing lead (or an earlier row
      // of this file) on any Contact Channel, and writes each new lead's first
      // lead_submissions row in the same transaction. The matching rules live
      // only in the database, in the lead_key_* functions.
      //
      // organizationId is passed as its own argument and is what the function
      // writes to every row — the org id sitting on each chunk row is ignored
      // by the function on purpose, so a forged row cannot reduce the RPC's
      // internal membership check to decoration. The client stays the
      // session-bound one from lib/supabase/server.ts, never admin.ts: the
      // RPC's membership check replaces the RLS policy that a service-role
      // client would have bypassed anyway.
      const { data, error } = await supabase.rpc("import_leads_chunk", {
        p_organization_id: organizationId,
        p_rows: chunk,
      });

      if (error) throw new Error(error.message);

      for (const row of (data ?? []) as RpcOutcome[]) {
        result.outcomes.push({
          rowIndex: i + row.row_index,
          outcome: row.outcome,
          leadId: row.lead_id,
          leadArchived: row.lead_archived,
          reason: row.reason,
        });
      }
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

export type OutcomeSummary = {
  insertedIds: string[];
  intraFileDuplicates: number;
  existingActive: number;
  existingArchived: number;
  rejected: number;
};

// A duplicate whose match was inserted by this same import is a duplicate
// inside the file (first row wins); any other match was already in the CRM.
// Purely descriptive: an archived match stays archived. The Resurrection
// Engine is for the webhook only.
export function summarizeOutcomes(outcomes: RowOutcome[]): OutcomeSummary {
  const insertedIds = outcomes.flatMap((o) => (o.outcome === "INSERTED" && o.leadId ? [o.leadId] : []));
  const inserted = new Set(insertedIds);
  const summary: OutcomeSummary = {
    insertedIds,
    intraFileDuplicates: 0,
    existingActive: 0,
    existingArchived: 0,
    rejected: 0,
  };

  for (const o of outcomes) {
    if (o.outcome === "REJECTED") summary.rejected += 1;
    if (o.outcome !== "DUPLICATE") continue;
    if (o.leadId && inserted.has(o.leadId)) summary.intraFileDuplicates += 1;
    else if (o.leadArchived) summary.existingArchived += 1;
    else summary.existingActive += 1;
  }

  return summary;
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
