import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
  computeWebhookSignature,
  isWebhookTimestampFresh,
  verifyWebhookSignature,
} from "./signature";

const SECRET = "3e64b668-1fb2-4737-b09a-a0b99aaff448";
const OTHER_SECRET = "00000000-0000-4000-8000-000000000000";
const BODY = new TextEncoder().encode(
  JSON.stringify({ client_name: "Ada Lovelace", email: "ada@example.com" }),
);
const TS = "1757808000";
const NOW = Number(TS);

describe("computeWebhookSignature", () => {
  it("produces a 64-character lowercase hex digest", () => {
    expect(computeWebhookSignature(BODY, SECRET, TS)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches the known-good HMAC-SHA256 vector for `timestamp.body` and this key", () => {
    // Independently confirmed with
    //   printf '%s' '1757808000.{"client_name":"Ada Lovelace","email":"ada@example.com"}' \
    //     | openssl dgst -sha256 -hmac '3e64b668-1fb2-4737-b09a-a0b99aaff448'
    // not copied from this implementation's own output. Pinned so a refactor
    // that swaps the algorithm, the key, the encoding or the `timestamp.body`
    // construction fails here rather than in production. Regenerated on
    // 2026-09-14 for the timestamped protocol — regenerate only alongside a
    // deliberate protocol change, and then every live caller changes with it,
    // starting with C:/Projects/tekguyz-site.
    expect(computeWebhookSignature(BODY, SECRET, TS)).toBe(
      "adb4cb939f3fd5395f6f3d5731c0c9155db5ccfce8adf53e1e4f28c1e2ede2d1",
    );
  });

  it("changes completely when a single body byte changes", () => {
    const tampered = new TextEncoder().encode(
      JSON.stringify({ client_name: "Ada Lovelacf", email: "ada@example.com" }),
    );
    expect(computeWebhookSignature(tampered, SECRET, TS)).not.toBe(
      computeWebhookSignature(BODY, SECRET, TS),
    );
  });

  it("changes when the signing key changes", () => {
    expect(computeWebhookSignature(BODY, OTHER_SECRET, TS)).not.toBe(
      computeWebhookSignature(BODY, SECRET, TS),
    );
  });

  it("changes when only the timestamp changes", () => {
    expect(computeWebhookSignature(BODY, SECRET, String(NOW + 1))).not.toBe(
      computeWebhookSignature(BODY, SECRET, TS),
    );
  });
});

describe("verifyWebhookSignature", () => {
  it("accepts a signature computed over the same timestamp and raw bytes", () => {
    expect(
      verifyWebhookSignature(BODY, SECRET, TS, computeWebhookSignature(BODY, SECRET, TS)),
    ).toBe(true);
  });

  it("accepts an uppercase hex signature", () => {
    const upper = computeWebhookSignature(BODY, SECRET, TS).toUpperCase();
    expect(verifyWebhookSignature(BODY, SECRET, TS, upper)).toBe(true);
  });

  it("rejects a missing signature", () => {
    expect(verifyWebhookSignature(BODY, SECRET, TS, null)).toBe(false);
    expect(verifyWebhookSignature(BODY, SECRET, TS, undefined)).toBe(false);
    expect(verifyWebhookSignature(BODY, SECRET, TS, "")).toBe(false);
  });

  it("rejects a signature made with a different signing key", () => {
    expect(
      verifyWebhookSignature(BODY, SECRET, TS, computeWebhookSignature(BODY, OTHER_SECRET, TS)),
    ).toBe(false);
  });

  it("rejects a valid signature over a different body (replayed onto tampered content)", () => {
    const tampered = new TextEncoder().encode(
      JSON.stringify({ client_name: "Mallory", email: "mallory@example.com" }),
    );
    expect(
      verifyWebhookSignature(tampered, SECRET, TS, computeWebhookSignature(BODY, SECRET, TS)),
    ).toBe(false);
  });

  it("rejects a valid signature moved onto a fresher timestamp — the replay the timestamp exists to stop", () => {
    // An attacker holding an old captured request cannot refresh it: changing
    // the timestamp header breaks the signature without the signing key.
    const captured = computeWebhookSignature(BODY, SECRET, TS);
    expect(verifyWebhookSignature(BODY, SECRET, String(NOW + 3600), captured)).toBe(false);
  });

  it("rejects a body-only signature — the pre-2026-09-14 protocol is not dual-supported", () => {
    const legacy = createHmac("sha256", SECRET).update(BODY).digest("hex");
    expect(verifyWebhookSignature(BODY, SECRET, TS, legacy)).toBe(false);
  });

  it("rejects a missing timestamp even alongside a signature over an empty prefix", () => {
    const overEmpty = computeWebhookSignature(BODY, SECRET, "");
    expect(verifyWebhookSignature(BODY, SECRET, null, overEmpty)).toBe(false);
    expect(verifyWebhookSignature(BODY, SECRET, undefined, overEmpty)).toBe(false);
    expect(verifyWebhookSignature(BODY, SECRET, "", overEmpty)).toBe(false);
  });

  it.each(["1.757808e9", "-1757808000", "1757808000.5", " 1757808000", "0x68c5a080", "1757808000000x"])(
    "rejects a malformed timestamp %j even when the signature was computed over it",
    (bad) => {
      expect(
        verifyWebhookSignature(BODY, SECRET, bad, computeWebhookSignature(BODY, SECRET, bad)),
      ).toBe(false);
    },
  );

  it("rejects malformed hex rather than truncating it", () => {
    // Buffer.from("zz…", "hex") decodes to an empty buffer instead of throwing.
    // Without the shape check this would compare two zero-length buffers and
    // pass, so this case is the whole reason HEX_SHA256_RE exists.
    expect(verifyWebhookSignature(BODY, SECRET, TS, "z".repeat(64))).toBe(false);
  });

  it("rejects a truncated or over-long signature", () => {
    const good = computeWebhookSignature(BODY, SECRET, TS);
    expect(verifyWebhookSignature(BODY, SECRET, TS, good.slice(0, 62))).toBe(false);
    expect(verifyWebhookSignature(BODY, SECRET, TS, `${good}ab`)).toBe(false);
  });

  it("rejects a `sha256=` prefixed signature — this protocol is bare hex only", () => {
    const good = computeWebhookSignature(BODY, SECRET, TS);
    expect(verifyWebhookSignature(BODY, SECRET, TS, `sha256=${good}`)).toBe(false);
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
    expect(
      verifyWebhookSignature(pretty, SECRET, TS, computeWebhookSignature(BODY, SECRET, TS)),
    ).toBe(false);
  });
});

describe("isWebhookTimestampFresh", () => {
  it("is five minutes either side", () => {
    expect(WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS).toBe(300);
  });

  it("accepts the current second and both edges of the window", () => {
    expect(isWebhookTimestampFresh(TS, NOW)).toBe(true);
    expect(isWebhookTimestampFresh(String(NOW - 300), NOW)).toBe(true);
    expect(isWebhookTimestampFresh(String(NOW + 300), NOW)).toBe(true);
  });

  it("rejects a timestamp more than five minutes in the PAST", () => {
    expect(isWebhookTimestampFresh(String(NOW - 301), NOW)).toBe(false);
    expect(isWebhookTimestampFresh(String(NOW - 86_400), NOW)).toBe(false);
  });

  it("rejects a timestamp more than five minutes in the FUTURE", () => {
    expect(isWebhookTimestampFresh(String(NOW + 301), NOW)).toBe(false);
    expect(isWebhookTimestampFresh(String(NOW + 86_400), NOW)).toBe(false);
  });

  it("rejects a milliseconds value — the header is whole seconds", () => {
    expect(isWebhookTimestampFresh(String(NOW * 1000), NOW)).toBe(false);
  });

  it("rejects a missing or malformed timestamp", () => {
    for (const bad of [null, undefined, "", "abc", "1.757808e9", "-1757808000", " 1757808000"]) {
      expect(isWebhookTimestampFresh(bad, NOW)).toBe(false);
    }
  });

  it("defaults to the real clock", () => {
    expect(isWebhookTimestampFresh(String(Math.floor(Date.now() / 1000)))).toBe(true);
  });
});

describe("header names", () => {
  it("are the lowercase canonical forms Headers.get() expects", () => {
    expect(WEBHOOK_SIGNATURE_HEADER).toBe("x-tekguyz-signature");
    expect(WEBHOOK_TIMESTAMP_HEADER).toBe("x-tekguyz-timestamp");
    for (const name of [WEBHOOK_SIGNATURE_HEADER, WEBHOOK_TIMESTAMP_HEADER]) {
      expect(name).toBe(name.toLowerCase());
    }
  });
});
