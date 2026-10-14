import { describe, expect, it, vi } from "vitest";

// Records every filter. The builder is thenable because getPipelineLeads
// awaits the query itself rather than ending on .order().
function mockSupabase() {
  const calls: Array<[string, string, unknown]> = [];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      calls.push(["eq", column, value]);
      return builder;
    }),
    is: vi.fn((column: string, value: unknown) => {
      calls.push(["is", column, value]);
      return builder;
    }),
    in: vi.fn((column: string, value: unknown) => {
      calls.push(["in", column, value]);
      return builder;
    }),
    order: vi.fn(() => builder),
    then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
      resolve({ data: [], error: null }),
  };
  return { calls, client: { from: vi.fn(() => builder) } };
}

async function loadQueries(mock: ReturnType<typeof mockSupabase>) {
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: () => Promise.resolve(mock.client),
  }));
  vi.resetModules();
  return import("@/lib/leads/queries");
}

describe("stage filter", () => {
  it("adds no stage filter when every stage is wanted", async () => {
    const mock = mockSupabase();
    const { getPipelineLeads, getAllContacts } = await loadQueries(mock);

    await getPipelineLeads("org-1", undefined, "");
    await getAllContacts("org-1", false, undefined, "");

    expect(mock.calls.filter(([op]) => op === "in")).toEqual([]);
  });

  it("filters the pipeline by stage in the query", async () => {
    const mock = mockSupabase();
    const { getPipelineLeads } = await loadQueries(mock);

    await getPipelineLeads("org-1", "user-1", "NEW,QUOTED");

    expect(mock.calls).toContainEqual(["in", "status", ["NEW", "QUOTED"]]);
    expect(mock.calls).toContainEqual(["eq", "assigned_to", "user-1"]);
  });

  it("filters contacts by stage on top of archived", async () => {
    const mock = mockSupabase();
    const { getAllContacts } = await loadQueries(mock);

    await getAllContacts("org-1", true, undefined, "ACTIVE");

    expect(mock.calls).toContainEqual(["in", "status", ["ACTIVE"]]);
    expect(mock.calls).toContainEqual(["eq", "archived", true]);
  });
});
