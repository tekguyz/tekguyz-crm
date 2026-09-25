import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC-SHA256 request signing for the inbound triage webhook.
 *
 * WHY THIS EXISTS (2026-08-18): the endpoint used to carry
 * `organizations.webhook_secret` in the URL path, so the secret was written
 * verbatim into every request log Vercel/Next keeps — unavoidably, on every
 * single call. The secret is now a *signing key*: it never leaves either end,
 * and only a per-request digest travels over the wire. Tenant resolution and
 * authentication are now two separate concerns — the URL carries the plain
 * `organization_id` (a UUID that grants nothing on its own) and this header
 * carries the proof.
 *
 * TIMESTAMPED SINCE 2026-09-14. The digest used to cover the body alone, so a
 * captured signed request could be resent forever and still verify. It now
 * covers `${timestamp}.${rawBody}`, with the timestamp sent in its own header:
 * changing the timestamp breaks the signature, and a timestamp more than
 * WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS from now is refused. That bounds a replay
 * to the tolerance window, and replay-guard.ts closes the window itself by
 * refusing a signature it has already seen. Hard cutover — a body-only
 * signature is not accepted any more.
 *
 * Deliberately NOT marked `server-only`. It holds no secret and touches no
 * database — it is pure crypto over bytes handed to it, which is what makes it
 * unit-testable in the hermetic `npm run test:unit` suite. The secret it is keyed with
 * is fetched by resolve-tenant.ts, which IS `server-only`.
 */

/**
 * Lowercase on purpose: `Headers.get()` is case-insensitive, so this is the
 * canonical form for lookups. Callers send it as `X-TekGuyz-Signature`. This
 * constant is now the authoritative spelling — the separate protocol doc was
 * removed on 2026-08-19 — so the caller in C:/Projects/tekguyz-site has to be
 * changed with it if it ever changes here.
 */
export const WEBHOOK_SIGNATURE_HEADER = "x-tekguyz-signature";

/**
 * Sent as `X-TekGuyz-Timestamp`: Unix time in whole SECONDS, as plain decimal
 * digits. Same authority rule as the signature header above.
 */
export const WEBHOOK_TIMESTAMP_HEADER = "x-tekguyz-timestamp";

/** How far either side of the server's clock a timestamp may be. Five minutes. */
export const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300;

/** A SHA-256 digest is 32 bytes, so exactly 64 hex characters. Nothing else. */
const HEX_SHA256_RE = /^[0-9a-f]{64}$/i;

/**
 * Digits only, and at most 12 of them, which is far past any real clock. No
 * sign, no decimal point, no exponent: `Number()` would accept `"1e9"` and
 * `" 17"`, and a milliseconds value would read as a date tens of thousands of
 * years out — rejected by the tolerance check anyway, but refused here first.
 */
const UNIX_SECONDS_RE = /^\d{1,12}$/;

/**
 * The digest a caller must send, over `${timestamp}.` followed by the raw body.
 * `rawBody` MUST be the exact bytes that were transmitted — never a
 * parsed-then-re-serialized object. `JSON.stringify` of a parsed payload is not
 * guaranteed byte-identical to what was sent (key order, whitespace, unicode
 * escaping, number formatting all differ), so signing a round-tripped body is
 * the classic way this check silently starts rejecting every legitimate
 * request. The prefix is fed to the HMAC as its own update, so the body bytes
 * are never decoded into a string and re-encoded either.
 */
export function computeWebhookSignature(
  rawBody: Uint8Array,
  signingSecret: string,
  timestamp: string,
): string {
  return createHmac("sha256", signingSecret)
    .update(`${timestamp}.`, "utf8")
    .update(rawBody)
    .digest("hex");
}

/**
 * Constant-time verification. Returns false for a missing or malformed
 * timestamp, and for a missing, malformed, or mismatched signature — the route
 * maps every one of those to the same 401, so nothing here reveals which part
 * failed. It does NOT check the timestamp's age; that is
 * isWebhookTimestampFresh, run by the route only after this passes.
 */
export function verifyWebhookSignature(
  rawBody: Uint8Array,
  signingSecret: string,
  timestamp: string | null | undefined,
  providedSignature: string | null | undefined,
): boolean {
  if (!timestamp || !UNIX_SECONDS_RE.test(timestamp)) {
    return false;
  }

  // Shape-check before decoding: `Buffer.from(x, "hex")` silently truncates at
  // the first invalid character rather than throwing, so "zz" would decode to
  // a zero-length buffer and compare equal to nothing at all. Rejecting on the
  // regex first also keeps every surviving input at exactly 32 bytes, which is
  // what makes timingSafeEqual's length precondition safe to rely on.
  if (!providedSignature || !HEX_SHA256_RE.test(providedSignature)) {
    return false;
  }

  const expected = Buffer.from(computeWebhookSignature(rawBody, signingSecret, timestamp), "hex");
  const provided = Buffer.from(providedSignature, "hex");

  // timingSafeEqual THROWS on a length mismatch rather than returning false,
  // so the guard is required, not defensive noise. Both are fixed-length
  // digests here, so this branch leaks nothing about the secret.
  if (expected.length !== provided.length) {
    return false;
  }

  // crypto.timingSafeEqual, never `===`. A plain string compare short-circuits
  // at the first differing byte, which is a timing side channel that lets an
  // attacker recover a valid digest one byte at a time.
  return timingSafeEqual(expected, provided);
}

/**
 * True when `timestamp` is within WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS of
 * `nowSeconds`, in EITHER direction. A future timestamp is refused as firmly as
 * an old one: accepting any future value would let a caller holding the key
 * pre-sign requests that stay valid indefinitely, and it would also defeat the
 * replay guard's TTL, which is sized from this tolerance.
 */
export function isWebhookTimestampFresh(
  timestamp: string | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!timestamp || !UNIX_SECONDS_RE.test(timestamp)) {
    return false;
  }
  return Math.abs(nowSeconds - Number(timestamp)) <= WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS;
}
