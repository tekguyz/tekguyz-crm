import "server-only";
import { Redis } from "@upstash/redis";

/**
 * The one Redis client, used by the inbound triage webhook's replay guard and
 * its per-tenant rate limiter (2026-09-14).
 *
 * Upstash's REST client rather than a TCP driver: the route runs as a Vercel
 * serverless function, so there is no long-lived process to hold a connection
 * pool open, and each command is one HTTPS request.
 *
 * Credentials: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN — Vercel
 * project environment variables in production, `.env` locally. The database is
 * shared with tekguyz.com, whose keys are all `tg:`-prefixed; neither key shape
 * used here can collide with that.
 */

/**
 * One attempt, one second. Both callers fail OPEN, so the only thing a slow or
 * dead store may cost is latency — and the SDK's default is five retries with
 * exponential backoff, which would hold every webhook request for seconds
 * before the fail-open path even ran.
 */
export const WEBHOOK_REDIS_TIMEOUT_MS = 1_000;

let client: Redis | undefined;

export function getWebhookRedis(): Redis {
  if (client) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    // Thrown, not returned as null. To both callers an unconfigured store IS an
    // unreachable store, and they already route that through their fail-open
    // catch, which logs. A silent null would switch replay protection off with
    // no trace anywhere — the exact failure shape the logging exists to stop.
    throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set");
  }

  client = new Redis({
    url,
    token,
    retry: false,
    // A function, not one shared signal: AbortSignal.timeout starts counting
    // when it is created, so a single signal would expire one second after the
    // first command and abort every command after it.
    signal: () => AbortSignal.timeout(WEBHOOK_REDIS_TIMEOUT_MS),
  });
  return client;
}
