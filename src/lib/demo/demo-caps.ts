import "server-only";
import { randomUUID } from "node:crypto";
import { getWebhookRedis } from "@/lib/redis/client";

// The per-hour caps on new Demo Orgs, so a bot pressing "Try the demo" 500
// times costs nothing and fills nothing (#29 user story 36).
//
// Same store and same shape as the webhook rate limiter
// (src/lib/webhooks/rate-limit.ts): one sorted set per key, each member one
// accepted press scored by its time in milliseconds, counted over a SLIDING
// window. A refused press is not counted.
export const DEMO_CAP_PER_IP_PER_HOUR = 5;
export const DEMO_CAP_TOTAL_PER_HOUR = 50;
const WINDOW_MS = 60 * 60 * 1000;

const ipKey = (ip: string) => `ratelimit:demo:ip:${ip}`;
const TOTAL_KEY = "ratelimit:demo:all";

/**
 * True when this press may make a Demo Org, and records it. False when either
 * cap is full, or when the store cannot be reached.
 *
 * FAILS CLOSED, unlike the webhook limiter. There, failing closed would drop a
 * real customer's leads. Here, the cap IS the protection: failing open would
 * let a bot fill the database for as long as the store is down, and the cost
 * of failing closed is only that the demo is briefly unavailable.
 */
export async function takeDemoSlot(ip: string): Promise<boolean> {
  try {
    const redis = getWebhookRedis();
    const now = Date.now();
    const expired = now - WINDOW_MS - 1;

    const [, perIp, , total] = await redis
      .pipeline()
      .zremrangebyscore(ipKey(ip), 0, expired)
      .zcard(ipKey(ip))
      .zremrangebyscore(TOTAL_KEY, 0, expired)
      .zcard(TOTAL_KEY)
      .exec<[number, number, number, number]>();

    if (perIp >= DEMO_CAP_PER_IP_PER_HOUR || total >= DEMO_CAP_TOTAL_PER_HOUR) {
      return false;
    }

    // Count-then-record is two round trips, so two presses arriving together
    // can both pass at the edge. A cap of 5 can become 6; that is a volume
    // guard's tolerance, not a hole.
    const member = `${now}:${randomUUID()}`;
    await redis
      .pipeline()
      .zadd(ipKey(ip), { score: now, member })
      .pexpire(ipKey(ip), WINDOW_MS)
      .zadd(TOTAL_KEY, { score: now, member })
      .pexpire(TOTAL_KEY, WINDOW_MS)
      .exec();

    return true;
  } catch (err) {
    console.error("[demo caps] store unavailable — refusing the press:", err instanceof Error ? err.message : err);
    return false;
  }
}
