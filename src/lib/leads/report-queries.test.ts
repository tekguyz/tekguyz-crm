import { describe, expect, it, vi } from "vitest";

import { resolvePeriodRange } from "@/lib/reports/periods";

// Records every filter call the two query builders receive, so the bucketing
// decision — closed leads on closed_at, open leads on created_at — is asserted
// at the query itself rather than inferred from the numbers it returns.
function mockSupabase() {
  const calls: Array<{ table: string; op: string; column: string; value: unknown }> = [];

  function builderFor(table: string, rows: unknown[]) {
    const builder: Record<string, unknown> = {};
    const record = (op: string) => (column: string, value: unknown) => {
      calls.push({ table, op, column, value });
      return builder;
    };
    Object.assign(builder, {
      select: () => builder,
      eq: record("eq"),
      is: record("is"),
      not: (column: string, op: string, value: unknown) => {
        calls.push({ table, op: `not.${op}`, column, value });
        return builder;
      },
      gte: record("gte"),
      lt: record("lt"),
      then: (resolve: (r: unknown) => unknown) => resolve({ data: rows, error: null }),
    });
    return builder;
  }

  let call = 0;
  const client = {
    from: vi.fn(() => {
      call += 1;
      // getPipelineReport builds the open query first, then the closed one.
      return builderFor(call === 1 ? "open" : "closed", []);
    }),
  };

  return { calls, client };
}

async function runReport(range: ReturnType<typeof resolvePeriodRange>) {
  const mock = mockSupabase();
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: () => Promise.resolve(mock.client),
  }));
  vi.resetModules();
  const { getPipelineReport } = await import("@/lib/leads/report-queries");
  await getPipelineReport("org-1", range);
  vi.doUnmock("@/lib/supabase/server");
  vi.resetModules();
  return mock.calls;
}

const CHICAGO = "America/Chicago";
const NOW = new Date("2026-09-12T12:00:00.000Z");

describe("getPipelineReport period filtering", () => {
  it("applies no date filter at all for all-time", async () => {
    const calls = await runReport(null);

    expect(calls.filter((c) => c.op === "gte" || c.op === "lt")).toEqual([]);
    // The all-time behaviour is unchanged: still tenant-scoped, still split
    // into open and closed the same way.
    expect(calls).toContainEqual({
      table: "open",
      op: "eq",
      column: "organization_id",
      value: "org-1",
    });
  });

  it("buckets CLOSED leads by closed_at, in the org's calendar month", async () => {
    const range = resolvePeriodRange("this-month", CHICAGO, NOW);
    const calls = await runReport(range);

    const closed = calls.filter((c) => c.table === "closed");
    // Chicago is UTC-5 in September, so the boundary is 05:00Z, not 00:00Z.
    expect(closed).toContainEqual({
      table: "closed",
      op: "gte",
      column: "closed_at",
      value: "2026-09-01T05:00:00.000Z",
    });
    // lt, not lte — the end is exclusive, so October's first lead is not
    // double-counted into September.
    expect(closed).toContainEqual({
      table: "closed",
      op: "lt",
      column: "closed_at",
      value: "2026-10-01T05:00:00.000Z",
    });
    expect(closed.some((c) => c.column === "created_at")).toBe(false);
  });

  it("buckets OPEN leads by created_at, because they have no closed_at yet", async () => {
    const range = resolvePeriodRange("this-month", CHICAGO, NOW);
    const calls = await runReport(range);

    const open = calls.filter((c) => c.table === "open");
    expect(open).toContainEqual({
      table: "open",
      op: "gte",
      column: "created_at",
      value: "2026-09-01T05:00:00.000Z",
    });
    expect(open.some((c) => c.column === "closed_at")).toBe(false);
  });

  it("keeps ABANDONED in the closed half, so it still counts toward period totals", async () => {
    const range = resolvePeriodRange("this-month", CHICAGO, NOW);
    const calls = await runReport(range);

    // The closed half selects every non-null outcome. Nothing narrows it to
    // WON/LOST, which is what keeps ABANDONED in the period totals while the
    // win-rate formula (computed in JS, untouched) still excludes it.
    expect(calls).toContainEqual({
      table: "closed",
      op: "not.is",
      column: "outcome",
      value: null,
    });
  });
});
