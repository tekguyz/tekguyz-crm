import "server-only";
import { getWebhookRedis } from "@/lib/redis/client";
import { logWebhookFailure, WEBHOOK_ERROR_CODES } from "@/lib/webhooks/ingestion-failure";
import { WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS } from "@/lib/webhooks/signature";

/**
 * Replay protection for the inbound triage webhook (2026-09-14).
 *
 * The timestamped signature (signature.ts) already stops a captured request
 * verifying once its timestamp leaves the tolerance window. This closes the
 * window itself: the first time a signature is seen it is recorded, and a
 * second sighting is a replay.
 *
 * There is no separate nonce. A signature is an HMAC over `${timestamp}.${body}`
 * and is only accepted while that timestamp is fresh, so it is already a
 * single-use, time-bound value — a nonce field would be a second copy of it.
 */

/**
 * 600 seconds — twice the timestamp tolerance, and that is the minimum, not a
 * margin. A timestamp may sit up to 300s in the FUTURE of the server clock, so a
 * signature first seen at time T can carry timestamp T+300 and keep passing the
 * freshness check until T+600. A key that expired any sooner would let that
 * same request be accepted a second time inside its own validity window.
 */
export const WEBHOOK_REPLAY_TTL_SECONDS = WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS * 2;

/**
 * `${organization_id}:${signature}`, with the signature LOWERCASED. The
 * verifier accepts hex in either case, so without normalising, one captured
 * request would yield 2^64 distinct keys by flipping letter case — and every
 * one of them would be a "first sighting".
 */
export function webhookReplayKey(organizationId: string, signature: string): string {
  return `${organizationId}:${signature.toLowerCase()}`;
}

/**
 * True when this signature has already been accepted for this tenant.
 *
 * One atomic `SET key 1 NX EX 600`: it records the signature and reports
 * whether it was already there in the same command, so two copies of one
 * request racing each other cannot both see "new".
 *
 * The key is written BEFORE the lead is ingested, so a request that then fails
 * with a 500 cannot be resent byte-for-byte. That is correct, not a side effect:
 * a legitimate retry signs again with a new timestamp, which is a new signature.
 */
export async function isReplayedWebhook(
  organizationId: string,
  signature: string,
): Promise<boolean> {
  try {
    const result = await getWebhookRedis().set(webhookReplayKey(organizationId, signature), 1, {
      nx: true,
      ex: WEBHOOK_REPLAY_TTL_SECONDS,
    });
    // "OK" when NX wrote the key; null when the key already existed.
    return result === null;
  } catch (err) {
    // FAIL OPEN, deliberately — the same posture rate-limit.ts has always had,
    // continued here rather than introduced quietly. A Redis outage must not
    // turn into lost inbound leads, and while the store is down the timestamp
    // check still bounds any replay to five minutes. Logged at ERROR, not warn:
    // unlike a 401 this is not scanner noise, it means a protection is off.
    logWebhookFailure({
      code: WEBHOOK_ERROR_CODES.STORE_UNAVAILABLE,
      organizationId,
      stage: "replay check",
      // Error text only. The key is never logged — it contains the signature.
      detail: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
