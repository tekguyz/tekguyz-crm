import { beforeEach, describe, expect, it, vi } from "vitest";

// Records the payload and the filters the update builder receives, so "only
// the edited fields moved" is asserted against the real write object rather
// than assumed from reading the action.
function mockSupabase(result: { error: { message: string } | null } = { error: null }) {
  const updates: Array<Record<string, unknown>> = [];
  const eqCalls: Array<[string, string]> = [];
  const builder = {
    update: vi.fn((payload: Record<string, unknown>) => {
      updates.push(payload);
      return builder;
    }),
    eq: vi.fn((column: string, value: string) => {
      eqCalls.push([column, value]);
      return builder;
    }),
    select: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data: { id: "task-1" }, ...result })),
  };
  return { updates, eqCalls, builder, client: { from: vi.fn(() => builder) } };
}

async function loadActions(mock: ReturnType<typeof mockSupabase>) {
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: () => Promise.resolve(mock.client),
  }));
  vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
  vi.resetModules();
  return import("@/lib/tasks/actions");
}

function editForm(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

describe("updateTask", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("writes exactly title, description and due_at — no lifecycle column moves", async () => {
    const mock = mockSupabase();
    const { updateTask } = await loadActions(mock);

    const result = await updateTask(
      "task-1",
      null,
      editForm({
        title: "Send the revised quote",
        description: "Include the second option",
        due_at: "2026-09-02T15:00:00.000Z",
      }),
    );

    expect(result).toBeNull();
    expect(mock.updates).toHaveLength(1);
    // The exact key set, not a subset check: `completed`, `completed_at`,
    // `dismissed`, `lead_id` and `organization_id` must all be absent, and a
    // subset assertion would not catch one being added later.
    expect(Object.keys(mock.updates[0]).sort()).toEqual(["description", "due_at", "title"]);
    expect(mock.updates[0]).toEqual({
      title: "Send the revised quote",
      description: "Include the second option",
      due_at: "2026-09-02T15:00:00.000Z",
    });
    expect(mock.eqCalls).toEqual([["id", "task-1"]]);
  });

  it("stores an emptied description as NULL, not an empty string", async () => {
    const mock = mockSupabase();
    const { updateTask } = await loadActions(mock);

    await updateTask(
      "task-1",
      null,
      editForm({ title: "Call back", description: "   ", due_at: "2026-09-02T15:00:00.000Z" }),
    );

    expect(mock.updates[0].description).toBeNull();
  });

  it("rejects a blank title without writing anything", async () => {
    const mock = mockSupabase();
    const { updateTask } = await loadActions(mock);

    const result = await updateTask(
      "task-1",
      null,
      editForm({ title: "  ", description: "", due_at: "2026-09-02T15:00:00.000Z" }),
    );

    expect(result).toEqual({ error: "Task title is required" });
    expect(mock.updates).toHaveLength(0);
  });

  it("rejects an unparseable due date without writing anything", async () => {
    const mock = mockSupabase();
    const { updateTask } = await loadActions(mock);

    const result = await updateTask(
      "task-1",
      null,
      editForm({ title: "Call back", description: "", due_at: "not-a-date" }),
    );

    expect(result).toEqual({ error: "Invalid due date" });
    expect(mock.updates).toHaveLength(0);
  });

  it("surfaces an RLS-denied write as an error instead of reporting success", async () => {
    const mock = mockSupabase({ error: { message: "No rows" } });
    const { updateTask } = await loadActions(mock);

    const result = await updateTask(
      "task-1",
      null,
      editForm({ title: "Call back", description: "", due_at: "2026-09-02T15:00:00.000Z" }),
    );

    expect(result).toEqual({ error: "No rows" });
  });
});

describe("dismissTask", () => {
  it("sets dismissed = true and touches nothing else", async () => {
    const mock = mockSupabase();
    const { dismissTask } = await loadActions(mock);

    await dismissTask("task-1");

    // Specifically NOT `completed` — dismissing is not completing, and a
    // dismissed task must not start reporting itself as done.
    expect(mock.updates).toEqual([{ dismissed: true }]);
    expect(mock.eqCalls).toEqual([["id", "task-1"]]);
  });

  it("throws when the write is denied rather than silently no-opping", async () => {
    const mock = mockSupabase({ error: { message: "No rows" } });
    const { dismissTask } = await loadActions(mock);

    await expect(dismissTask("task-1")).rejects.toMatchObject({ message: "No rows" });
  });
});
