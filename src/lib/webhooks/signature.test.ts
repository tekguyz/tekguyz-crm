import { describe, expect, it } from "vitest";

import {
  WEBHOOK_SIGNATURE_HEADER,
  computeWebhookSignature,
  verifyWebhookSignature,
} from "./signature";

const SECRET = "3e64b668-1fb2-4737-b09a-a0b99aaff448";
const OTHER_SECRET = "00000000-0000-4000-8000-000000000000";
const BODY = new TextEncoder().encode(
  JSON.stringify({ client_name: "Ada Lovelace", email: "ada@example.com" }),
);

describe("computeWebhookSignature", () => {
  it("produces a 64-character lowercase hex digest", () => {
    expect(computeWebhookSignature(BODY, SECRET)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches the known-good HMAC-SHA256 vector for this body and key", () => {
    // Independently confirmed with `openssl dgst -sha256 -hmac`, not copied
    // from this implementation's own output. Pinned so a refactor that swaps the algorithm, the key, or the encoding
    // fails here rather than in production. Regenerate only alongside a
    // deliberate protocol change — and then every live caller changes with
    // it, starting with C:/Projects/tekguyz-site.
    expect(computeWebhookSignature(BODY, SECRET)).toBe(
      "becdd5abcfff34c52f7a93573e363a672921ffe92d332e3375324fcc5076b8f7",
    );
  });

  it("changes completely when a single body byte changes", () => {
    const tampered = new TextEncoder().encode(
      JSON.stringify({ client_name: "Ada Lovelacf", email: "ada@example.com" }),
    );
    expect(computeWebhookSignature(tampered, SECRET)).not.toBe(
      computeWebhookSignature(BODY, SECRET),
    );
  });

  it("changes when the signing key changes", () => {
    expect(computeWebhookSignature(BODY, OTHER_SECRET)).not.toBe(
      computeWebhookSignature(BODY, SECRET),
    );
  });
});

describe("verifyWebhookSignature", () => {
  it("accepts a signature computed over the same raw bytes", () => {
    expect(verifyWebhookSignature(BODY, SECRET, computeWebhookSignature(BODY, SECRET))).toBe(true);
  });

  it("accepts an uppercase hex signature", () => {
    const upper = computeWebhookSignature(BODY, SECRET).toUpperCase();
    expect(verifyWebhookSignature(BODY, SECRET, upper)).toBe(true);
  });

  it("rejects a missing signature", () => {
    expect(verifyWebhookSignature(BODY, SECRET, null)).toBe(false);
    expect(verifyWebhookSignature(BODY, SECRET, undefined)).toBe(false);
    expect(verifyWebhookSignature(BODY, SECRET, "")).toBe(false);
  });

  it("rejects a signature made with a different signing key", () => {
    expect(verifyWebhookSignature(BODY, SECRET, computeWebhookSignature(BODY, OTHER_SECRET))).toBe(
      false,
    );
  });

  it("rejects a valid signature over a different body (replayed onto tampered content)", () => {
    const tampered = new TextEncoder().encode(
      JSON.stringify({ client_name: "Mallory", email: "mallory@example.com" }),
    );
    expect(verifyWebhookSignature(tampered, SECRET, computeWebhookSignature(BODY, SECRET))).toBe(
      false,
    );
  });

  it("rejects malformed hex rather than truncating it", () => {
    // Buffer.from("zz…", "hex") decodes to an empty buffer instead of throwing.
    // Without the shape check this would compare two zero-length buffers and
    // pass, so this case is the whole reason HEX_SHA256_RE exists.
    expect(verifyWebhookSignature(BODY, SECRET, "z".repeat(64))).toBe(false);
  });

  it("rejects a truncated or over-long signature", () => {
    const good = computeWebhookSignature(BODY, SECRET);
    expect(verifyWebhookSignature(BODY, SECRET, good.slice(0, 62))).toBe(false);
    expect(verifyWebhookSignature(BODY, SECRET, `${good}ab`)).toBe(false);
  });

  it("rejects a `sha256=` prefixed signature — this protocol is bare hex only", () => {
    const good = computeWebhookSignature(BODY, SECRET);
    expect(verifyWebhookSignature(BODY, SECRET, `sha256=${good}`)).toBe(false);
  });

  it("signs raw bytes, not a re-serialized object", () => {
    // Same JSON value, different bytes on the wire (pretty-printed). A caller
    // that signs JSON.stringify(parsedBody) instead of what it actually sent
    // produces exactly this mismatch, and it fails 100% of the time rather
    // than intermittently — which is why the route reads arrayBuffer() before
    // any parsing happens.
    const pretty = new TextEncoder().encode(
      JSON.stringify({ client_name: "Ada Lovelace", email: "ada@example.com" }, null, 2),
    );
    expect(verifyWebhookSignature(pretty, SECRET, computeWebhookSignature(BODY, SECRET))).toBe(
      false,
    );
  });
});

describe("WEBHOOK_SIGNATURE_HEADER", () => {
  it("is the lowercase canonical form Headers.get() expects", () => {
    expect(WEBHOOK_SIGNATURE_HEADER).toBe("x-tekguyz-signature");
    expect(WEBHOOK_SIGNATURE_HEADER).toBe(WEBHOOK_SIGNATURE_HEADER.toLowerCase());
  });
});
