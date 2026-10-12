import { beforeEach, describe, expect, it, vi } from "vitest";

// The stage a lead is created in (#47 step 3: "+ New" at the foot of a lane).
// Only the action's own decision is under test, so everything it reaches for
// is stubbed at its boundary.
const insertLeadWithSubmission = vi.fn(async (..._args: unknown[]) => ({
  ok: true as const,
  leadId: "lead-1",
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/organizations/current", () => ({
  getCurrentOrg: async () => ({ orgId: "org-1" }),
}));
vi.mock("@/lib/leads/queries", () => ({ getAllContacts: vi.fn(), getLeadById: vi.fn() }));
vi.mock("@/lib/leads/create", () => ({
  insertLeadWithSubmission: (...args: unknown[]) => insertLeadWithSubmission(...args),
}));

const { createLead } = await import("@/lib/leads/actions");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("createLead — stage", () => {
  beforeEach(() => insertLeadWithSubmission.mockClear());

  it("creates the lead in the stage the form posted", async () => {
    const result = await createLead(
      null,
      form({ client_name: "Dana Rivers", email: "dana@example.invalid", status: "QUOTED" }),
    );

    expect(result).toBeNull();
    expect(insertLeadWithSubmission).toHaveBeenCalledTimes(1);
    expect(insertLeadWithSubmission.mock.calls[0][2]).toMatchObject({ status: "QUOTED" });
  });

  it.each([["", "missing"], ["WON", "not a pipeline stage"], ["quoted", "wrong case"]])(
    "refuses a status that is %j (%s) and writes nothing",
    async (status) => {
      const result = await createLead(
        null,
        form({ client_name: "Dana Rivers", email: "dana@example.invalid", status }),
      );

      expect(result).toEqual({ error: "Pick a stage for the lead." });
      expect(insertLeadWithSubmission).not.toHaveBeenCalled();
    },
  );
});
