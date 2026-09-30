import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  insertLeadChunks,
  listSkippedRows,
  summarizeOutcomes,
  type RowOutcome,
} from "@/lib/import/insert-chunks";
import type { InsertRow } from "@/lib/import/build-insert-rows";

const row = (n: number) => ({ client_name: `Lead ${n}`, phone: `${n}` }) as unknown as InsertRow;

// A stand-in for import_leads_chunk: every row inserted, row_index local to
// the chunk, exactly as the SQL returns it.
function fakeClient(failChunkStartingWith?: string) {
  const rpc = vi.fn(async (_name: string, args: { p_rows: InsertRow[] }) => {
    if (args.p_rows[0].client_name === failChunkStartingWith) return { data: null, error: { message: "boom" } };
    return {
      data: args.p_rows.map((r, i) => ({
        row_index: i,
        outcome: "INSERTED",
        lead_id: `id-${r.client_name}`,
        lead_archived: false,
        reason: null,
      })),
      error: null,
    };
  });
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe("insertLeadChunks", () => {
  it("turns each chunk's local row_index into the row's index in the whole import", async () => {
    const rows = Array.from({ length: 251 }, (_, n) => row(n));
    const { client, rpc } = fakeClient();

    const result = await insertLeadChunks(client, "org-1", rows);

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(result.outcomes).toHaveLength(251);
    expect(result.outcomes[250]).toEqual({
      rowIndex: 250,
      outcome: "INSERTED",
      leadId: "id-Lead 250",
      leadArchived: false,
      reason: null,
    });
  });

  it("counts a failed chunk and carries on with the next", async () => {
    const rows = Array.from({ length: 251 }, (_, n) => row(n));
    const { client } = fakeClient("Lead 0");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await insertLeadChunks(client, "org-1", rows);

    expect(result.failedChunks).toBe(1);
    expect(result.failedChunkRows).toBe(250);
    expect(result.outcomes.map((o) => o.rowIndex)).toEqual([250]);
  });
});

describe("summarizeOutcomes", () => {
  const outcome = (o: Partial<RowOutcome>): RowOutcome => ({
    rowIndex: 0,
    outcome: "INSERTED",
    leadId: null,
    leadArchived: null,
    reason: null,
    ...o,
  });

  it("splits duplicates into inside-the-file, active and archived", () => {
    const summary = summarizeOutcomes([
      outcome({ rowIndex: 0, outcome: "INSERTED", leadId: "new-1", leadArchived: false }),
      outcome({ rowIndex: 1, outcome: "DUPLICATE", leadId: "new-1", leadArchived: false }),
      outcome({ rowIndex: 2, outcome: "DUPLICATE", leadId: "old-1", leadArchived: false }),
      outcome({ rowIndex: 3, outcome: "DUPLICATE", leadId: "old-2", leadArchived: true }),
      outcome({ rowIndex: 4, outcome: "REJECTED", reason: "NO_CONTACT_CHANNEL" }),
    ]);

    expect(summary).toEqual({
      insertedIds: ["new-1"],
      intraFileDuplicates: 1,
      existingActive: 1,
      existingArchived: 1,
    });
  });
});

describe("listSkippedRows", () => {
  const outcome = (o: Partial<RowOutcome>): RowOutcome => ({
    rowIndex: 0,
    outcome: "INSERTED",
    leadId: null,
    leadArchived: null,
    reason: null,
    ...o,
  });

  it("names every row that did not import, by its place in the rows the client sent", () => {
    // Row 1 of what the client sent failed the server re-check, so the RPC
    // saw sent rows 0, 2, 3, 4, 5 as its rows 0..4.
    const sentIndex = [0, 2, 3, 4, 5];

    const skipped = listSkippedRows(
      [
        outcome({ rowIndex: 0, outcome: "INSERTED", leadId: "new-1", leadArchived: false }),
        outcome({ rowIndex: 1, outcome: "DUPLICATE", leadId: "new-1", leadArchived: false }),
        outcome({ rowIndex: 2, outcome: "DUPLICATE", leadId: "old-1", leadArchived: false }),
        outcome({ rowIndex: 3, outcome: "DUPLICATE", leadId: "old-2", leadArchived: true }),
        outcome({ rowIndex: 4, outcome: "REJECTED", reason: "NO_CONTACT_CHANNEL" }),
      ],
      sentIndex,
    );

    expect(skipped).toEqual([
      { index: 2, kind: "IN_FILE", firstIndex: 0 },
      { index: 3, kind: "EXISTING", leadId: "old-1", archived: false },
      { index: 4, kind: "EXISTING", leadId: "old-2", archived: true },
      { index: 5, kind: "REJECTED", reason: "NO_CONTACT_CHANNEL" },
    ]);
  });
});
