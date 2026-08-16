import type { SupabaseClient } from "@supabase/supabase-js";
import type { InsertRow } from "@/lib/import/dedup";

const CHUNK_SIZE = 250;

export type ChunkedInsertResult = {
  insertedIds: string[];
  skippedEmails: string[];
  failedChunks: number;
  failedChunkRows: number;
};

type ImportedLeadRow = { lead_id: string; lead_email: string };

// Mirrors the lower(trim(...)) the RPC applies before storing, so the diff
// below compares like with like.
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function insertLeadChunks(
  supabase: SupabaseClient,
  organizationId: string,
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
      // Goes through a SECURITY DEFINER RPC rather than PostgREST's upsert.
      // The only unique index here is unique_tenant_client_email_ci ON leads
      // (organization_id, lower(email)) — an EXPRESSION index, which
      // PostgREST's column-list `onConflict` parameter cannot address, so the
      // old .upsert() threw on every single chunk and import could never
      // insert a row. Raw SQL can infer an expression index; the RPC is that
      // raw SQL. See 20260815120000_import_leads_chunk_rpc.sql.
      //
      // organizationId is passed as its own argument and is what the function
      // writes to every row — the org id sitting on each chunk row is ignored
      // by the function on purpose, so a forged row cannot reduce the RPC's
      // internal membership check to decoration. The client stays the
      // session-bound one from lib/supabase/server.ts, never admin.ts: the
      // RPC's membership check replaces the RLS policy that a service-role
      // client would have bypassed anyway.
      const { data: inserted, error } = await supabase.rpc("import_leads_chunk", {
        p_organization_id: organizationId,
        p_rows: chunk,
      });

      if (error) throw new Error(error.message);

      // Diff the chunk against what actually came back, rather than
      // pre-querying for existing emails — a pre-query is a TOCTOU race
      // across chunks, whereas the RPC's own returned rows are atomic
      // with the write. Anything missing was skipped as a duplicate.
      const returned = (inserted ?? []) as ImportedLeadRow[];
      const insertedEmails = new Set(returned.map((row) => normalizeEmail(row.lead_email)));

      // Both sides of the diff are normalized the same way the RPC normalizes
      // before storing. The Zod layer already lowercases, so this changes
      // nothing on the real path — but without it a caller that skipped Zod
      // would have its rows inserted and then counted as "already existed",
      // a silent miscount rather than an error. The skipped email is pushed in
      // its normalized form too, because reportDuplicateBreakdown looks it up
      // against the stored (lowercased) value.
      for (const row of chunk) {
        const email = normalizeEmail(row.email);
        if (!insertedEmails.has(email)) result.skippedEmails.push(email);
      }
      result.insertedIds.push(...returned.map((row) => row.lead_id));
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
