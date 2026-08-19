import { describe, expect, it, vi } from "vitest";

// Records the column filters and the selected column list, so the dismissed
// filter is asserted at the database boundary — where it belongs. Filtering
// in the client instead would still ship dismissed rows to the browser.
function mockSupabase(rows: unknown[]) {
  const eqCalls: Array<[string, unknown]> = [];
  const selects: string[] = [];
  const builder = {
    select: vi.fn((columns: string) => {
      selects.push(columns);
      return builder;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      eqCalls.push([column, value]);
      return builder;
    }),
    order: vi.fn(() => Promise.resolve({ data: rows, error: null })),
  };
  return { eqCalls, selects, client: { from: vi.fn(() => builder) } };
}

async function loadQueries(mock: ReturnType<typeof mockSupabase>) {
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: () => Promise.resolve(mock.client),
  }));
  vi.resetModules();
  return import("@/lib/tasks/queries");
}

describe("getTasksForLead", () => {
  it("filters dismissed rows out at the database and selects the column", async () => {
    const mock = mockSupabase([]);
    const { getTasksForLead } = await loadQueries(mock);

    await getTasksForLead("lead-1");

    expect(mock.eqCalls).toContainEqual(["dismissed", false]);
    expect(mock.eqCalls).toContainEqual(["lead_id", "lead-1"]);
    expect(mock.selects[0]).toContain("dismissed");
  });

  it("does NOT filter on completed — the Open/Completed split stays client-side", async () => {
    const mock = mockSupabase([]);
    const { getTasksForLead } = await loadQueries(mock);

    await getTasksForLead("lead-1");

    expect(mock.eqCalls.map(([column]) => column)).not.toContain("completed");
  });
});

describe("getTasksDueForOrg", () => {
  it("filters on dismissed = false as well as completed = false", async () => {
    const mock = mockSupabase([]);
    const { getTasksDueForOrg } = await loadQueries(mock);

    await getTasksDueForOrg("org-1");

    // Both, independently: dismissed is orthogonal to completed, so a
    // dismissed-but-open task must be excluded by its own filter.
    expect(mock.eqCalls).toContainEqual(["dismissed", false]);
    expect(mock.eqCalls).toContainEqual(["completed", false]);
    expect(mock.eqCalls).toContainEqual(["organization_id", "org-1"]);
    expect(mock.eqCalls).toContainEqual(["leads.archived", false]);
  });

  it("keeps a non-dismissed row in the agenda list", async () => {
    const mock = mockSupabase([
      {
        id: "task-1",
        title: "Send the quote",
        due_at: "2026-09-01T15:00:00.000Z",
        lead_id: "lead-1",
        leads: { client_name: "Acme", archived: false },
      },
    ]);
    const { getTasksDueForOrg } = await loadQueries(mock);

    const result = await getTasksDueForOrg("org-1");

    expect(result).toEqual([
      {
        id: "task-1",
        title: "Send the quote",
        due_at: "2026-09-01T15:00:00.000Z",
        lead_id: "lead-1",
        client_name: "Acme",
      },
    ]);
  });
});
