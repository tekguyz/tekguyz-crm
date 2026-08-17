"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";
import { validatedRowSchema, type ValidatedRow } from "@/lib/validation/csv-lead-schema";
import { dedupeByEmail, buildInsertRows } from "@/lib/import/dedup";
import { insertLeadChunks, logImportedLeads } from "@/lib/import/insert-chunks";
import { reportDuplicateBreakdown } from "@/lib/import/report-duplicates";
import { recordLeadSubmissions } from "@/lib/submissions/record";

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
  // organization_id comes from the caller's own session, never the payload,
  // and is handed to insertLeadChunks explicitly. The client below stays the
  // session-bound one (NOT admin.ts, which would bypass RLS entirely), so the
  // JWT reaches the database and auth.uid() resolves.
  //
  // The chunk write itself now runs inside a SECURITY DEFINER RPC, which
  // bypasses RLS — so on that one path the tenant boundary is the RPC's own
  // membership re-check, not the "Members create tenant leads" WITH CHECK
  // policy. Every other statement in this action still goes through RLS.
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

  const { insertedIds, insertedLeads, skippedEmails, failedChunks, failedChunkRows } =
    await insertLeadChunks(supabase, orgId, insertRows);

  if (insertedIds.length > 0) {
    await logImportedLeads(supabase, orgId, insertedIds);

    // Every lead gets a first lead_submissions row whatever created it, so the
    // profile sheet's enquiry history is never empty for a real lead. Only
    // rows the RPC actually inserted are here — a skipped duplicate did NOT
    // create a lead, so it must not create a submission either (that would
    // fabricate an enquiry the CSV never represented, and DO NOTHING means we
    // do not even know which existing lead it would attach to).
    //
    // Joined on the RPC's returned email, which is stored lower(trim(...))'d,
    // against the same normalization insertLeadChunks uses for its own diff.
    const rowsByEmail = new Map(insertRows.map((row) => [row.email.trim().toLowerCase(), row]));

    await recordLeadSubmissions(
      supabase,
      insertedLeads.flatMap((inserted) => {
        const row = rowsByEmail.get(inserted.lead_email.trim().toLowerCase());
        if (!row) return [];
        return [
          {
            leadId: inserted.lead_id,
            organizationId: orgId,
            clientName: row.client_name,
            email: inserted.lead_email,
            phone: row.phone,
            company: row.company,
            // A CSV has no per-enquiry message field; nothing was said, so
            // nothing is recorded as having been said.
            message: null,
            serviceCategory: row.service_category,
            // Defaulted to CSV_IMPORT_SOURCE by buildInsertRows, so the
            // submission records the same origin the lead row does.
            leadSource: row.lead_source,
          },
        ];
      }),
    );
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
