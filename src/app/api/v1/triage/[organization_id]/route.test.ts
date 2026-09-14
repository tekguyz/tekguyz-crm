// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from "@/lib/webhooks/signature";
import { createFakeRedis, type FakeRedis } from "@/test/fake-redis";

// Failure visibility for the inbound triage webhook (2026-09-05). Before this
// work, a signature-valid request that failed downstream produced a bare 500
// and no signal anywhere — the only feedback loop was a client asking why
// their enquiry never arrived. These tests pin the two halves of the fix: a
// structured log line, and an operator alert that fires for authenticated
// failures ONLY.
//
// Since 2026-09-14 the route also runs the REAL replay guard and the REAL rate
// limiter, over an in-memory Redis (src/test/fake-redis.ts). Only the Redis
// client itself is mocked, so the check order and the fail-open paths are
// exercised through the route rather than asserted about in isolation.

const ORG_ID = "11111111-2222-3333-4444-555555555555";
const SIGNING_KEY = "super-secret-signing-key-do-not-log";

const VALID_PAYLOAD = {
  client_name: "Alex Rivera",
  email: "alex@rivera-stone.example",
  message: "Need a quote for a kitchen worktop.",
};

type RoutePost = (
  request: Request,
  context: { params: Promise<{ organization_id: string }> },
) => Promise<Response>;

type RouteMocks = {
  alerts: Array<Record<string, unknown>>;
  ingest: ReturnType<typeof vi.fn>;
};

async function loadRoute(
  ingestImpl: () => Promise<{ leadId: string; submissionId: string }>,
  { getRedis }: { getRedis?: () => unknown } = {},
): Promise<{ POST: RoutePost; mocks: RouteMocks; redis: FakeRedis }> {
  const alerts: Array<Record<string, unknown>> = [];
  const ingest = vi.fn(ingestImpl);
  const redis = createFakeRedis();

  vi.doMock("server-only", () => ({}));
  vi.doMock("@/lib/webhooks/resolve-tenant", () => ({
    getOrgSigningKey: vi.fn(async (id: string) => (id === ORG_ID ? SIGNING_KEY : null)),
  }));
  vi.doMock("@/lib/redis/client", () => ({ getWebhookRedis: getRedis ?? (() => redis) }));
  vi.doMock("@/lib/webhooks/ingest-lead", () => ({ ingestWebhookLead: ingest }));
  vi.doMock("@/lib/email/alert-ingestion-failure", () => ({
    sendIngestionFailureAlert: vi.fn(async (failure: Record<string, unknown>) => {
      alerts.push(failure);
    }),
  }));

  vi.resetModules();
  const mod = await import("./route");
  return { POST: mod.POST as unknown as RoutePost, mocks: { alerts, ingest }, redis };
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

function signedRequest(
  body: string,
  {
    sign = true,
    timestamp = String(nowSeconds()),
    omitTimestamp = false,
    signature,
  }: { sign?: boolean; timestamp?: string; omitTimestamp?: boolean; signature?: string } = {},
): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  headers[WEBHOOK_SIGNATURE_HEADER] =
    signature ??
    (sign
      ? computeWebhookSignature(new TextEncoder().encode(body), SIGNING_KEY, timestamp)
      : "f".repeat(64));
  if (!omitTimestamp) headers[WEBHOOK_TIMESTAMP_HEADER] = timestamp;
  return new Request(`http://localhost/api/v1/triage/${ORG_ID}`, {
    method: "POST",
    headers,
    body,
  });
}

function ctx(organizationId = ORG_ID) {
  return { params: Promise.resolve({ organization_id: organizationId }) };
}

const logged = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.map((call) => call.join(" ")).join("\n");

describe("POST /api/v1/triage/[organization_id] — failure visibility", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("alerts exactly once, with the org id and the error detail, when an authenticated request fails to persist", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST, mocks } = await loadRoute(async () => {
      throw new Error("insert into leads failed: connection terminated");
    });

    const response = await POST(signedRequest(JSON.stringify(VALID_PAYLOAD)), ctx());

    // Status is deliberately unchanged: an uncaught throw already produced 500.
    expect(response.status).toBe(500);
    expect(mocks.alerts).toHaveLength(1);
    expect(mocks.alerts[0]).toMatchObject({
      organizationId: ORG_ID,
      code: "WEBHOOK_INGEST_UNEXPECTED",
    });
    expect(String(mocks.alerts[0].detail)).toContain("connection terminated");

    // The alert payload carries no credential material of any kind.
    expect(JSON.stringify(mocks.alerts[0])).not.toContain(SIGNING_KEY);

    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("does NOT alert on a bad signature — a 401 is expected background noise", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST, mocks } = await loadRoute(async () => ({ leadId: "l1", submissionId: "s1" }));

    const response = await POST(
      signedRequest(JSON.stringify(VALID_PAYLOAD), { sign: false }),
      ctx(),
    );

    expect(response.status).toBe(401);
    expect(mocks.alerts).toHaveLength(0);
    expect(mocks.ingest).not.toHaveBeenCalled();
    // Warn, not error: erroring on scanner traffic would train everyone to
    // ignore this channel.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).not.toContain(SIGNING_KEY);
    warn.mockRestore();
    error.mockRestore();
  });

  it("does NOT alert on an unknown organization id", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { POST, mocks } = await loadRoute(async () => ({ leadId: "l1", submissionId: "s1" }));

    const unknown = "99999999-9999-9999-9999-999999999999";
    const response = await POST(
      new Request(`http://localhost/api/v1/triage/${unknown}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(VALID_PAYLOAD),
      }),
      ctx(unknown),
    );

    expect(response.status).toBe(401);
    expect(mocks.alerts).toHaveLength(0);
    warn.mockRestore();
  });

  it("does NOT alert on a successful ingestion", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST, mocks } = await loadRoute(async () => ({
      leadId: "lead-1",
      submissionId: "sub-1",
    }));

    const response = await POST(signedRequest(JSON.stringify(VALID_PAYLOAD)), ctx());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, leadId: "lead-1" });
    expect(mocks.ingest).toHaveBeenCalledTimes(1);
    expect(mocks.alerts).toHaveLength(0);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("never puts the signing key or the signature header value in the failure log line", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await loadRoute(async () => {
      throw new Error("database write failed");
    });

    const request = signedRequest(JSON.stringify(VALID_PAYLOAD));
    const sentSignature = request.headers.get(WEBHOOK_SIGNATURE_HEADER) as string;

    await POST(request, ctx());

    const lines = logged(error);
    expect(lines).toContain("[webhook-triage-failure]");
    expect(lines).toContain(ORG_ID);
    expect(lines).not.toContain(SIGNING_KEY);
    expect(lines).not.toContain(sentSignature);
    // ...and no PII from the enquiry body either.
    expect(lines).not.toContain(VALID_PAYLOAD.email);
    expect(lines).not.toContain(VALID_PAYLOAD.client_name);
    error.mockRestore();
  });

  it("alerts on a signature-valid request whose payload fails validation, without echoing the submitted values", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST, mocks } = await loadRoute(async () => ({ leadId: "l1", submissionId: "s1" }));

    const body = JSON.stringify({ client_name: "Alex Rivera", email: "not-an-email" });
    const response = await POST(signedRequest(body), ctx());

    // Status unchanged: this case was already a 400.
    expect(response.status).toBe(400);
    expect(mocks.alerts).toHaveLength(1);
    expect(mocks.alerts[0]).toMatchObject({
      code: "WEBHOOK_INVALID_PAYLOAD",
      organizationId: ORG_ID,
    });
    expect(String(mocks.alerts[0].detail)).toContain("email");
    expect(String(mocks.alerts[0].detail)).not.toContain("not-an-email");
    error.mockRestore();
  });

  it("alerts on an unparseable body from a signed caller, and never logs the body", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST, mocks } = await loadRoute(async () => ({ leadId: "l1", submissionId: "s1" }));

    const response = await POST(signedRequest('{"client_name": "Alex Rivera", oops'), ctx());

    expect(response.status).toBe(400);
    expect(mocks.alerts).toHaveLength(1);
    expect(mocks.alerts[0]).toMatchObject({ code: "WEBHOOK_INVALID_JSON" });
    expect(logged(error)).not.toContain("Alex Rivera");
    error.mockRestore();
  });
});

describe("POST /api/v1/triage/[organization_id] — timestamp, replay and rate limit", () => {
  const ok = async () => ({ leadId: "lead-1", submissionId: "sub-1" });

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("REPLAY: rejects the second of two identical body+signature+timestamp requests with the same opaque 401", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { POST, mocks, redis } = await loadRoute(ok);

    const body = JSON.stringify(VALID_PAYLOAD);
    const timestamp = String(nowSeconds());
    const first = await POST(signedRequest(body, { timestamp }), ctx());
    const second = await POST(signedRequest(body, { timestamp }), ctx());

    expect(first.status).toBe(200);
    expect(second.status).toBe(401);
    await expect(second.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mocks.ingest).toHaveBeenCalledTimes(1);
    expect(mocks.alerts).toHaveLength(0);

    // The distinct reason exists in the log only, never in the response.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("WEBHOOK_REPLAY_REJECTED");

    // Replay is checked BEFORE the rate limiter, so the replayed copy spent no
    // budget: one accepted request, one entry.
    expect(redis.zsets.get(`ratelimit:webhook:${ORG_ID}`)?.size).toBe(1);
  });

  it("REPLAY: a case-flipped copy of an accepted signature is the same replay", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { POST, mocks } = await loadRoute(ok);

    const body = JSON.stringify(VALID_PAYLOAD);
    const timestamp = String(nowSeconds());
    const original = signedRequest(body, { timestamp });
    const upper = (original.headers.get(WEBHOOK_SIGNATURE_HEADER) as string).toUpperCase();

    expect((await POST(original, ctx())).status).toBe(200);
    expect((await POST(signedRequest(body, { timestamp, signature: upper }), ctx())).status).toBe(
      401,
    );
    expect(mocks.ingest).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["past", -301],
    ["future", 301],
  ])(
    "SKEW: rejects a correctly signed request whose timestamp is more than 5 minutes in the %s",
    async (_direction, offset) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { POST, mocks, redis } = await loadRoute(ok);

      const response = await POST(
        signedRequest(JSON.stringify(VALID_PAYLOAD), { timestamp: String(nowSeconds() + offset) }),
        ctx(),
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
      expect(mocks.ingest).not.toHaveBeenCalled();
      expect(mocks.alerts).toHaveLength(0);
      expect(String(warn.mock.calls[0][0])).toContain("WEBHOOK_TIMESTAMP_REJECTED");
      // Refused before the replay guard: a stale request is never recorded as
      // seen, and never touches the rate limiter.
      expect(redis.strings.size).toBe(0);
      expect(redis.zsets.size).toBe(0);
    },
  );

  it.each([
    ["past", -290],
    ["future", 290],
  ])("SKEW: accepts a timestamp just inside the window, in the %s", async (_direction, offset) => {
    const { POST, mocks } = await loadRoute(ok);
    const response = await POST(
      signedRequest(JSON.stringify(VALID_PAYLOAD), { timestamp: String(nowSeconds() + offset) }),
      ctx(),
    );
    expect(response.status).toBe(200);
    expect(mocks.ingest).toHaveBeenCalledTimes(1);
  });

  it("rejects a request with no timestamp header", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { POST, mocks } = await loadRoute(ok);
    const response = await POST(
      signedRequest(JSON.stringify(VALID_PAYLOAD), { omitTimestamp: true }),
      ctx(),
    );
    expect(response.status).toBe(401);
    expect(mocks.ingest).not.toHaveBeenCalled();
  });

  it("gives every refusal — bad signature, missing timestamp, expired timestamp, replay — an identical status and body", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { POST } = await loadRoute(ok);
    const body = JSON.stringify(VALID_PAYLOAD);
    const timestamp = String(nowSeconds());

    await POST(signedRequest(body, { timestamp }), ctx());
    const refusals = [
      await POST(signedRequest(body, { sign: false }), ctx()),
      await POST(signedRequest(body, { omitTimestamp: true }), ctx()),
      await POST(signedRequest(body, { timestamp: String(nowSeconds() - 3600) }), ctx()),
      await POST(signedRequest(body, { timestamp }), ctx()),
    ];

    const shapes = await Promise.all(
      refusals.map(async (r) => `${r.status} ${JSON.stringify(await r.json())}`),
    );
    expect(new Set(shapes)).toEqual(new Set(['401 {"error":"Unauthorized"}']));
  });

  it("RATE LIMIT: answers a distinct 429, not a 401, once the tenant is over 30 a minute", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { POST, mocks } = await loadRoute(ok);

    for (let i = 0; i < 30; i++) {
      expect(
        (await POST(signedRequest(JSON.stringify({ ...VALID_PAYLOAD, message: `m${i}` })), ctx()))
          .status,
      ).toBe(200);
    }
    const limited = await POST(
      signedRequest(JSON.stringify({ ...VALID_PAYLOAD, message: "one too many" })),
      ctx(),
    );

    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
    await expect(limited.json()).resolves.toEqual({ error: "Rate limit exceeded (max 30/min)" });
    expect(mocks.ingest).toHaveBeenCalledTimes(30);
  });

  it("FAIL-OPEN: the replay check cannot reach Redis — the request still succeeds, and the outage is logged", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST, mocks } = await loadRoute(ok, {
      getRedis: () => createFakeRedis({ failSet: true }),
    });

    const response = await POST(signedRequest(JSON.stringify(VALID_PAYLOAD)), ctx());

    expect(response.status).toBe(200);
    expect(mocks.ingest).toHaveBeenCalledTimes(1);
    expect(mocks.alerts).toHaveLength(0);
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain("WEBHOOK_STORE_UNAVAILABLE");
    expect(String(error.mock.calls[0][0])).toContain("replay check");
  });

  it("FAIL-OPEN: the rate limiter cannot reach Redis — the request still succeeds, and the outage is logged", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST, mocks } = await loadRoute(ok, {
      getRedis: () => createFakeRedis({ failPipeline: true }),
    });

    const response = await POST(signedRequest(JSON.stringify(VALID_PAYLOAD)), ctx());

    expect(response.status).toBe(200);
    expect(mocks.ingest).toHaveBeenCalledTimes(1);
    expect(mocks.alerts).toHaveLength(0);
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain("WEBHOOK_STORE_UNAVAILABLE");
    expect(String(error.mock.calls[0][0])).toContain("rate limit");
  });

  it("FAIL-OPEN: Redis not configured at all — the request still succeeds, and both guards log it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST, mocks } = await loadRoute(ok, {
      getRedis: () => {
        throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set");
      },
    });

    const response = await POST(signedRequest(JSON.stringify(VALID_PAYLOAD)), ctx());

    expect(response.status).toBe(200);
    expect(mocks.ingest).toHaveBeenCalledTimes(1);
    const lines = logged(error);
    expect(lines).toContain("replay check");
    expect(lines).toContain("rate limit");
    expect(error).toHaveBeenCalledTimes(2);
  });
});
