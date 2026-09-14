import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeRedis, type FakeRedis } from "@/test/fake-redis";

// The per-tenant webhook rate limiter, against its Redis backend (2026-09-14).
// Until then it counted activity_logs rows and had no tests of its own; these
// pin the window and threshold it kept through the storage swap.

const ORG = "11111111-2222-3333-4444-555555555555";
const OTHER_ORG = "66666666-7777-8888-9999-000000000000";
const T = Date.UTC(2026, 8, 14, 12, 0, 0);

async function load(getRedis: () => unknown) {
  vi.doMock("server-only", () => ({}));
  vi.doMock("@/lib/redis/client", () => ({ getWebhookRedis: getRedis }));
  vi.resetModules();
  return import("./rate-limit");
}

describe("isRateLimited", () => {
  let redis: FakeRedis;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T);
    redis = createFakeRedis();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps the threshold at 30 per minute", async () => {
    const { WEBHOOK_RATE_LIMIT_PER_MINUTE } = await load(() => redis);
    expect(WEBHOOK_RATE_LIMIT_PER_MINUTE).toBe(30);
  });

  it("allows 30 requests in a minute and refuses the 31st", async () => {
    const { isRateLimited } = await load(() => redis);
    for (let i = 0; i < 30; i++) {
      expect(await isRateLimited(ORG)).toBe(false);
    }
    expect(await isRateLimited(ORG)).toBe(true);
  });

  it("does not count a refused request against the budget", async () => {
    const { isRateLimited, webhookRateLimitKey } = await load(() => redis);
    for (let i = 0; i < 30; i++) await isRateLimited(ORG);
    for (let i = 0; i < 5; i++) expect(await isRateLimited(ORG)).toBe(true);

    expect(redis.zsets.get(webhookRateLimitKey(ORG))?.size).toBe(30);
  });

  it("still counts a request exactly 60s old, and releases it 1ms later — same bound as the old created_at >= windowStart query", async () => {
    const { isRateLimited } = await load(() => redis);
    for (let i = 0; i < 30; i++) await isRateLimited(ORG);

    vi.setSystemTime(T + 60_000);
    expect(await isRateLimited(ORG)).toBe(true);

    vi.setSystemTime(T + 60_001);
    expect(await isRateLimited(ORG)).toBe(false);
  });

  it("slides — it does not reset the whole budget on a minute boundary", async () => {
    const { isRateLimited } = await load(() => redis);
    // One request a second for 30 seconds.
    for (let i = 0; i < 30; i++) {
      vi.setSystemTime(T + i * 1000);
      await isRateLimited(ORG);
    }

    // 60.001s after the FIRST one, only that one has aged out: exactly one
    // slot is free, then the tenant is limited again. A fixed per-minute
    // bucket would have handed back all 30.
    vi.setSystemTime(T + 60_001);
    expect(await isRateLimited(ORG)).toBe(false);
    expect(await isRateLimited(ORG)).toBe(true);
  });

  it("keeps tenants separate", async () => {
    const { isRateLimited } = await load(() => redis);
    for (let i = 0; i < 30; i++) await isRateLimited(ORG);
    expect(await isRateLimited(ORG)).toBe(true);
    expect(await isRateLimited(OTHER_ORG)).toBe(false);
  });

  it("keys on ratelimit:webhook:<organization_id> and expires the set after the window", async () => {
    const { isRateLimited } = await load(() => redis);
    await isRateLimited(ORG);
    expect([...redis.zsets.keys()]).toEqual([`ratelimit:webhook:${ORG}`]);
    expect(redis.pexpires).toEqual([{ key: `ratelimit:webhook:${ORG}`, ms: 60_000 }]);
  });

  it("fails OPEN when Redis times out, and logs it at error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { isRateLimited } = await load(() => createFakeRedis({ failPipeline: true }));

    expect(await isRateLimited(ORG)).toBe(false);

    expect(error).toHaveBeenCalledTimes(1);
    const line = String(error.mock.calls[0][0]);
    expect(line).toContain("[webhook-triage-failure]");
    expect(line).toContain("WEBHOOK_STORE_UNAVAILABLE");
    expect(line).toContain("rate limit");
    expect(line).toContain(ORG);
    expect(line).toContain("timeout");
  });

  it("fails OPEN when Redis is not configured at all", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { isRateLimited } = await load(() => {
      throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set");
    });

    expect(await isRateLimited(ORG)).toBe(false);
    expect(String(error.mock.calls[0][0])).toContain("are not set");
  });
});
