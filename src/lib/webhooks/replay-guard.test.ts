import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeRedis, type FakeRedis } from "@/test/fake-redis";

const ORG = "11111111-2222-3333-4444-555555555555";
const OTHER_ORG = "66666666-7777-8888-9999-000000000000";
const SIGNATURE = "ABCDEF0123456789".repeat(4);
const T = Date.UTC(2026, 8, 14, 12, 0, 0);

async function load(getRedis: () => unknown) {
  // replay-guard.ts and the Redis client are `server-only`, which throws on
  // import outside a Server Component — including a vitest run.
  vi.doMock("server-only", () => ({}));
  vi.doMock("@/lib/redis/client", () => ({ getWebhookRedis: getRedis }));
  vi.resetModules();
  return import("./replay-guard");
}

describe("isReplayedWebhook", () => {
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

  it("reports a first sighting as new and the second as a replay", async () => {
    const { isReplayedWebhook } = await load(() => redis);
    expect(await isReplayedWebhook(ORG, SIGNATURE)).toBe(false);
    expect(await isReplayedWebhook(ORG, SIGNATURE)).toBe(true);
  });

  it("stores `${organization_id}:${signature}` lowercased, for 600 seconds", async () => {
    const { isReplayedWebhook, webhookReplayKey, WEBHOOK_REPLAY_TTL_SECONDS } = await load(
      () => redis,
    );
    await isReplayedWebhook(ORG, SIGNATURE);

    expect(WEBHOOK_REPLAY_TTL_SECONDS).toBe(600);
    expect(webhookReplayKey(ORG, SIGNATURE)).toBe(`${ORG}:${SIGNATURE.toLowerCase()}`);
    expect([...redis.strings.keys()]).toEqual([`${ORG}:${SIGNATURE.toLowerCase()}`]);
    expect(redis.strings.get(`${ORG}:${SIGNATURE.toLowerCase()}`)?.expiresAt).toBe(T + 600_000);
  });

  it("treats a case-flipped copy of a seen signature as the same replay", async () => {
    const { isReplayedWebhook } = await load(() => redis);
    await isReplayedWebhook(ORG, SIGNATURE);
    expect(await isReplayedWebhook(ORG, SIGNATURE.toLowerCase())).toBe(true);
  });

  it("scopes a signature to its tenant", async () => {
    const { isReplayedWebhook } = await load(() => redis);
    await isReplayedWebhook(ORG, SIGNATURE);
    expect(await isReplayedWebhook(OTHER_ORG, SIGNATURE)).toBe(false);
  });

  it("still remembers a signature 599 seconds later, and forgets it at 600", async () => {
    // Remembering it for the full 600s is what covers a timestamp that sat
    // 300s in the future: that request keeps passing the freshness check
    // until 600s after it was first seen.
    const { isReplayedWebhook } = await load(() => redis);
    await isReplayedWebhook(ORG, SIGNATURE);

    vi.setSystemTime(T + 599_000);
    expect(await isReplayedWebhook(ORG, SIGNATURE)).toBe(true);

    vi.setSystemTime(T + 600_000);
    expect(await isReplayedWebhook(ORG, SIGNATURE)).toBe(false);
  });

  it("fails OPEN when Redis times out, and logs it at error without the signature", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { isReplayedWebhook } = await load(() => createFakeRedis({ failSet: true }));

    expect(await isReplayedWebhook(ORG, SIGNATURE)).toBe(false);

    expect(error).toHaveBeenCalledTimes(1);
    const line = String(error.mock.calls[0][0]);
    expect(line).toContain("[webhook-triage-failure]");
    expect(line).toContain("WEBHOOK_STORE_UNAVAILABLE");
    expect(line).toContain("replay check");
    expect(line).toContain(ORG);
    expect(line.toLowerCase()).not.toContain(SIGNATURE.toLowerCase());
  });

  it("fails OPEN when Redis is not configured at all", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { isReplayedWebhook } = await load(() => {
      throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set");
    });

    expect(await isReplayedWebhook(ORG, SIGNATURE)).toBe(false);
    expect(String(error.mock.calls[0][0])).toContain("are not set");
  });
});
