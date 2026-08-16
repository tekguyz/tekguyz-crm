import { describe, expect, it, vi } from "vitest";

import {
  getOpenInvites,
  partitionInvitesByExpiry,
  type PendingInvite,
} from "@/lib/invites/queries";

const NOW = new Date("2026-08-16T12:00:00.000Z");

function invite(overrides: Partial<PendingInvite> & { id: string }): PendingInvite {
  return {
    email: `${overrides.id}@example.com`,
    role: "MEMBER",
    token: `token-${overrides.id}`,
    expires_at: "2026-08-23T12:00:00.000Z",
    ...overrides,
  };
}

describe("partitionInvitesByExpiry", () => {
  it("keeps a still-live invite in the pending bucket", () => {
    const live = invite({ id: "live", expires_at: "2026-08-23T12:00:00.000Z" });

    const { pending, expired } = partitionInvitesByExpiry([live], NOW);

    expect(pending).toEqual([live]);
    expect(expired).toEqual([]);
  });

  it("keeps an expired invite OUT of the pending bucket", () => {
    const stale = invite({ id: "stale", expires_at: "2026-08-01T12:00:00.000Z" });

    const { pending, expired } = partitionInvitesByExpiry([stale], NOW);

    expect(pending).toEqual([]);
    // Surfaced, not dropped — it still occupies the partial unique index and
    // still blocks re-inviting that address.
    expect(expired).toEqual([stale]);
  });

  it("splits a mixed list without losing or duplicating a row", () => {
    const live = invite({ id: "live", expires_at: "2026-08-23T12:00:00.000Z" });
    const stale = invite({ id: "stale", expires_at: "2026-07-01T12:00:00.000Z" });

    const { pending, expired } = partitionInvitesByExpiry([live, stale], NOW);

    expect(pending.map((i) => i.id)).toEqual(["live"]);
    expect(expired.map((i) => i.id)).toEqual(["stale"]);
  });
});

describe("getOpenInvites", () => {
  /**
   * Records the `.eq()` calls the query builder receives, so the status filter
   * itself is asserted rather than assumed. An ACCEPTED (or REVOKED) invite is
   * excluded at the database, which is why it can never reach either bucket.
   */
  function mockSupabase(rows: PendingInvite[]) {
    const eqCalls: Array<[string, string]> = [];
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn((column: string, value: string) => {
        eqCalls.push([column, value]);
        return builder;
      }),
      order: vi.fn(() => Promise.resolve({ data: rows, error: null })),
    };
    return {
      eqCalls,
      client: { from: vi.fn(() => builder) },
      builder,
    };
  }

  it("filters on status = 'PENDING' explicitly, so an ACCEPTED invite never appears", async () => {
    // This test runs against the real clock, so the dates are far-future /
    // far-past rather than near today's date.
    const live = invite({ id: "live", expires_at: "2099-01-01T00:00:00.000Z" });
    const stale = invite({ id: "stale", expires_at: "2000-01-01T00:00:00.000Z" });
    const mock = mockSupabase([live, stale]);

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: () => Promise.resolve(mock.client),
    }));
    vi.resetModules();
    const { getOpenInvites: subject } = await import("@/lib/invites/queries");

    const result = await subject("org-1");

    expect(mock.eqCalls).toContainEqual(["status", "PENDING"]);
    // Positive filter only — a negative `status <> 'REVOKED'` would silently
    // start rendering any status added later.
    expect(mock.eqCalls.every(([, value]) => value !== "REVOKED")).toBe(true);
    expect(mock.eqCalls).toContainEqual(["organization_id", "org-1"]);

    // And the expired PENDING row is still kept out of the pending list.
    expect(result.pending.map((i) => i.id)).toEqual(["live"]);
    expect(result.expired.map((i) => i.id)).toEqual(["stale"]);

    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("is exported as getOpenInvites", () => {
    expect(typeof getOpenInvites).toBe("function");
  });
});
