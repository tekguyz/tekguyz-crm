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
 * Deliberately NOT marked `server-only`. It holds no secret and touches no
 * database — it is pure crypto over bytes handed to it, which is what makes it
 * unit-testable in the hermetic `npm test` suite. The secret it is keyed with
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

/** A SHA-256 digest is 32 bytes, so exactly 64 hex characters. Nothing else. */
const HEX_SHA256_RE = /^[0-9a-f]{64}$/i;

/**
 * The digest a caller must send. `rawBody` MUST be the exact bytes that were
 * transmitted — never a parsed-then-re-serialized object. `JSON.stringify` of
 * a parsed payload is not guaranteed byte-identical to what was sent (key
 * order, whitespace, unicode escaping, number formatting all differ), so
 * signing a round-tripped body is the classic way this check silently starts
 * rejecting every legitimate request.
 */
export function computeWebhookSignature(rawBody: Uint8Array, signingSecret: string): string {
  return createHmac("sha256", signingSecret).update(rawBody).digest("hex");
}

/**
 * Constant-time verification. Returns false for a missing, malformed, or
 * mismatched signature — the route maps every one of those to the same 401,
 * so nothing here reveals which part failed.
 */
export function verifyWebhookSignature(
  rawBody: Uint8Array,
  signingSecret: string,
  providedSignature: string | null | undefined,
): boolean {
  // Shape-check before decoding: `Buffer.from(x, "hex")` silently truncates at
  // the first invalid character rather than throwing, so "zz" would decode to
  // a zero-length buffer and compare equal to nothing at all. Rejecting on the
  // regex first also keeps every surviving input at exactly 32 bytes, which is
  // what makes timingSafeEqual's length precondition safe to rely on.
  if (!providedSignature || !HEX_SHA256_RE.test(providedSignature)) {
    return false;
  }

  const expected = Buffer.from(computeWebhookSignature(rawBody, signingSecret), "hex");
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
