"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";
import {
  validatedProspectRowSchema,
  type ValidatedProspectRow,
} from "@/lib/validation/csv-prospect-schema";
import { dedupeByPlaceId, insertProspectChunks } from "@/lib/prospects/import-chunks";

// A NEW file alongside import-actions.ts, which is untouched. Nothing here
// imports from the leads import path and nothing there imports from here — the
// two share only the Supabase client factory and getCurrentOrg.
export type ProspectImportResult = {
  rowsInFile: number;
  imported: number;
  intraFileDuplicates: number;
  alreadyPresent: number;
  duplicatePhoneMatches: number;
  rejectedServerSide: number;
  failedChunks: number;
  failedChunkRows: number;
  error?: string;
};

const emptyResult = (rowsInFile = 0): ProspectImportResult => ({
  rowsInFile,
  imported: 0,
  intraFileDuplicates: 0,
  alreadyPresent: 0,
  duplicatePhoneMatches: 0,
  rejectedServerSide: 0,
  failedChunks: 0,
  failedChunkRows: 0,
});

export async function importProspects(
  rows: ValidatedProspectRow[],
): Promise<ProspectImportResult> {
  // organization_id comes from the caller's own session, never the payload, and
  // is handed to insertProspectChunks explicitly. The client below stays the
  // session-bound one (NOT admin.ts, which would bypass RLS entirely), so the
  // JWT reaches the database and auth.uid() resolves inside the RPC — where the
  // membership re-check, not the "Members create tenant prospects" policy, is
  // the tenant boundary, because SECURITY DEFINER bypasses RLS.
  const { orgId } = await getCurrentOrg();
  const supabase = await createClient();

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ...emptyResult(), error: "No rows were submitted." };
  }

  const rowsInFile = rows.length;

  // Re-validated server-side even though the client already validated these
  // rows: a Server Action is a public HTTP endpoint.
  const revalidated: ValidatedProspectRow[] = [];
  let rejectedServerSide = 0;

  for (const row of rows) {
    const parsed = validatedProspectRowSchema.safeParse(row);
    if (parsed.success) revalidated.push(parsed.data);
    else rejectedServerSide += 1;
  }

  const { unique, intraFileDuplicates } = dedupeByPlaceId(revalidated);

  const { inserted, skippedPlaceIds, duplicatePhoneMatches, failedChunks, failedChunkRows } =
    await insertProspectChunks(supabase, orgId, unique);

  revalidatePath("/prospects/import");

  return {
    rowsInFile,
    imported: inserted.length,
    intraFileDuplicates,
    // Rows the RPC declined because a prospect with that place_id already
    // existed in this tenant. This is what makes a second run of the same file
    // report "0 imported / N already present" rather than looking like a
    // failure.
    alreadyPresent: skippedPlaceIds.length,
    duplicatePhoneMatches,
    rejectedServerSide,
    failedChunks,
    failedChunkRows,
  };
}
