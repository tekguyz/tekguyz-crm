import "server-only";
import { randomUUID } from "node:crypto";
import { getWebhookRedis } from "@/lib/redis/client";
import { logWebhookFailure, WEBHOOK_ERROR_CODES } from "@/lib/webhooks/ingestion-failure";

// Threshold for inbound webhook volume per tenant. Same values since before
// 2026-09-14; only the storage changed.
export const WEBHOOK_RATE_LIMIT_PER_MINUTE = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * One sorted set per tenant: each member is one accepted request, scored by its
 * arrival time in milliseconds.
 *
 * Until 2026-09-14 this counted `activity_logs` WEBHOOK rows from the last 60
 * seconds — a database query standing in for a store. The sorted set keeps that
 * exact shape (a SLIDING 60s window, not a fixed per-minute bucket, which would
 * let 2x the limit through across a minute boundary) and the same rule: a
 * refused request is not counted, so a caller that backs off gets its budget
 * back as its own earlier requests age out.
 */
export function webhookRateLimitKey(organizationId: string): string {
  return `ratelimit:webhook:${organizationId}`;
}

export async function isRateLimited(organizationId: string): Promise<boolean> {
  try {
    const redis = getWebhookRedis();
    const key = webhookRateLimitKey(organizationId);
    const now = Date.now();

    // Drop everything older than the window, then count what is left. Scores
    // are integer milliseconds, so `<= now - window - 1` keeps exactly the
    // entries the old `created_at >= windowStart` query counted.
    const [, inWindow] = await redis
      .pipeline()
      .zremrangebyscore(key, 0, now - RATE_LIMIT_WINDOW_MS - 1)
      .zcard(key)
      .exec<[number, number]>();

    if (inWindow >= WEBHOOK_RATE_LIMIT_PER_MINUTE) {
      return true;
    }

    // Count-then-record is two round trips, so two requests arriving together
    // at 29 can both pass and land the set at 31. The activity_logs version had
    // the same gap (count now, insert later, after ingestion). This is a volume
    // guard, not a security boundary; a Lua script to close it is not warranted.
    // The random suffix keeps two requests in the same millisecond from
    // collapsing into one member.
    await redis
      .pipeline()
      .zadd(key, { score: now, member: `${now}:${randomUUID()}` })
      .pexpire(key, RATE_LIMIT_WINDOW_MS)
      .exec();

    return false;
  } catch (err) {
    // FAIL OPEN — unchanged posture from the activity_logs implementation,
    // which returned false on a query error. Fail closed would block a tenant's
    // real leads on an infra hiccup, and this is a volume guard, not a security
    // boundary. What is new is the log line: the old version failed open
    // silently.
    logWebhookFailure({
      code: WEBHOOK_ERROR_CODES.STORE_UNAVAILABLE,
      organizationId,
      stage: "rate limit",
      detail: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
