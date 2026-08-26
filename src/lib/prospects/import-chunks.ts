import type { SupabaseClient } from "@supabase/supabase-js";
import type { ValidatedProspectRow } from "@/lib/validation/csv-prospect-schema";

const CHUNK_SIZE = 250;

// Two rows in the same file sharing a place_id would collide on
// unique_tenant_place_id *within a single INSERT statement*, which ON CONFLICT
// DO NOTHING does not protect against — that only handles conflicts with rows
// already committed. So this has to happen before any database call. First
// occurrence wins, matching dedupeByEmail on the leads side.
//
// The current two leadgen files hold 122 rows and 122 distinct place_ids, so
// this is zero today. It is not decoration: leadgen's "all-niches" run queries
// several niches against one city, and the same business legitimately appears
// under two categories.
export function dedupeByPlaceId(rows: ValidatedProspectRow[]): {
  unique: ValidatedProspectRow[];
  intraFileDuplicates: number;
} {
  const seen = new Map<string, ValidatedProspectRow>();
  let intraFileDuplicates = 0;

  for (const row of rows) {
    // Case-sensitive on purpose. A Place ID is an opaque token, not an email;
    // unique_tenant_place_id compares it verbatim, so folding case here would
    // let two genuinely different ids collapse into one.
    const key = row.place_id;
    if (seen.has(key)) {
      intraFileDuplicates += 1;
      continue;
    }
    seen.set(key, row);
  }

  return { unique: [...seen.values()], intraFileDuplicates };
}

export type ImportedProspectRow = {
  prospect_id: string;
  prospect_place_id: string;
  duplicate_lead_id: string | null;
};

export type ChunkedProspectResult = {
  inserted: ImportedProspectRow[];
  skippedPlaceIds: string[];
  duplicatePhoneMatches: number;
  failedChunks: number;
  failedChunkRows: number;
};

export async function insertProspectChunks(
  supabase: SupabaseClient,
  organizationId: string,
  rows: ValidatedProspectRow[],
): Promise<ChunkedProspectResult> {
  const result: ChunkedProspectResult = {
    inserted: [],
    skippedPlaceIds: [],
    duplicatePhoneMatches: 0,
    failedChunks: 0,
    failedChunkRows: 0,
  };

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    try {
      // organizationId is passed as its own argument and is what the function
      // writes to every row — the RPC's recordset definition has no
      // organization_id column at all, so a forged row cannot reach the insert.
      // The client stays the session-bound one from lib/supabase/server.ts,
      // never admin.ts: the RPC's internal membership check is the tenant
      // boundary on this path, and it needs a real auth.uid().
      const { data, error } = await supabase.rpc("import_prospects_chunk", {
        p_organization_id: organizationId,
        p_rows: chunk,
      });

      if (error) throw new Error(error.message);

      // Diff the chunk against what actually came back rather than
      // pre-querying for existing place_ids — a pre-query is a TOCTOU race
      // across chunks, whereas the RPC's returned rows are atomic with the
      // write. Anything missing was skipped as an existing duplicate.
      const returned = (data ?? []) as ImportedProspectRow[];
      const insertedIds = new Set(returned.map((row) => row.prospect_place_id));

      for (const row of chunk) {
        if (!insertedIds.has(row.place_id)) result.skippedPlaceIds.push(row.place_id);
      }

      result.inserted.push(...returned);
      result.duplicatePhoneMatches += returned.filter(
        (row) => row.duplicate_lead_id !== null,
      ).length;
    } catch (err) {
      // One bad chunk must not abort the rest of the batch — record it and keep
      // going, so a transient failure costs 250 rows, not the import.
      result.failedChunks += 1;
      result.failedChunkRows += chunk.length;
      console.error(
        `[insertProspectChunks] chunk starting at row ${i} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return result;
}
