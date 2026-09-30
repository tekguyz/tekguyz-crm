// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The daily Demo Org cleanup (#31). The database function decides WHAT is old
// enough and safe to delete (proven by src/lib/demo/demo-cleanup.rls.test.ts
// against the real database). This route's job is the rest: only the cron may
// call it, it asks for the right cutoff, it deletes every Guest the function
// hands back, and it says when anything failed.

const T = Date.UTC(2026, 8, 30, 8, 0, 0);
const SEVEN_DAYS_AGO = new Date(T - 7 * 24 * 60 * 60 * 1000).toISOString();

type Batch = { data: { guest_user_id: string }[] | null; error: { message: string } | null };

async function load(batches: Batch[], failDeleteFor: string[] = []) {
  const rpc = vi.fn(async () => batches.shift() ?? { data: [], error: null });
  const deleteUser = vi.fn(async (id: string) => ({
    error: failDeleteFor.includes(id) ? { message: "boom" } : null,
  }));
  vi.resetModules();
  vi.doMock("server-only", () => ({}));
  vi.doMock("@/lib/supabase/admin", () => ({
    createAdminClient: () => ({ rpc, auth: { admin: { deleteUser } } }),
  }));
  const { GET } = await import("./route");
  const call = (auth?: string) =>
    GET(
      new Request("https://crm.example.com/api/cron/demo-cleanup", {
        headers: auth ? { authorization: auth } : {},
      }) as never,
    );
  return { call, rpc, deleteUser };
}

const guests = (...ids: string[]) => ({ data: ids.map((guest_user_id) => ({ guest_user_id })), error: null });

describe("GET /api/cron/demo-cleanup", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T);
  });

  afterEach(() => vi.useRealTimers());

  it("refuses anyone without the cron secret, and deletes nothing", async () => {
    const { call, rpc, deleteUser } = await load([guests("g1")]);

    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes Demo Orgs older than 7 days, then each Guest the database hands back", async () => {
    const { call, rpc, deleteUser } = await load([guests("g1", "g2")]);

    const response = await call("Bearer cron-secret");

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("delete_expired_demo_orgs", {
      p_cutoff: SEVEN_DAYS_AGO,
      p_limit: 100,
    });
    expect(deleteUser.mock.calls.map(([id]) => id)).toEqual(["g1", "g2"]);
    expect(await response.json()).toEqual({ guestsDeleted: 2, guestsFailed: 0 });
  });

  it("keeps going while batches come back full", async () => {
    const full = guests(...Array.from({ length: 100 }, (_, i) => `a${i}`));
    const { call, rpc, deleteUser } = await load([full, guests("b1")]);

    await call("Bearer cron-secret");

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(deleteUser).toHaveBeenCalledTimes(101);
  });

  it("reports a failed Guest delete as a failure, and still deletes the rest", async () => {
    const { call, deleteUser } = await load([guests("g1", "g2")], ["g1"]);

    const response = await call("Bearer cron-secret");

    expect(response.status).toBe(500);
    expect(deleteUser).toHaveBeenCalledTimes(2);
    expect(await response.json()).toEqual({ guestsDeleted: 1, guestsFailed: 1 });
  });

  it("reports a database failure", async () => {
    const { call, deleteUser } = await load([{ data: null, error: { message: "db down" } }]);

    expect((await call("Bearer cron-secret")).status).toBe(500);
    expect(deleteUser).not.toHaveBeenCalled();
  });
});
