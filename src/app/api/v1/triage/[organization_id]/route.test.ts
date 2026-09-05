// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeWebhookSignature, WEBHOOK_SIGNATURE_HEADER } from "@/lib/webhooks/signature";

// Failure visibility for the inbound triage webhook (2026-09-05). Before this
// work, a signature-valid request that failed downstream produced a bare 500
// and no signal anywhere — the only feedback loop was a client asking why
// their enquiry never arrived. These tests pin the two halves of the fix: a
// structured log line, and an operator alert that fires for authenticated
// failures ONLY.

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
): Promise<{ POST: RoutePost; mocks: RouteMocks }> {
  const alerts: Array<Record<string, unknown>> = [];
  const ingest = vi.fn(ingestImpl);

  vi.doMock("@/lib/webhooks/resolve-tenant", () => ({
    getOrgSigningKey: vi.fn(async (id: string) => (id === ORG_ID ? SIGNING_KEY : null)),
  }));
  vi.doMock("@/lib/webhooks/rate-limit", () => ({
    isRateLimited: vi.fn(async () => false),
    WEBHOOK_RATE_LIMIT_PER_MINUTE: 60,
  }));
  vi.doMock("@/lib/webhooks/ingest-lead", () => ({ ingestWebhookLead: ingest }));
  vi.doMock("@/lib/email/alert-ingestion-failure", () => ({
    sendIngestionFailureAlert: vi.fn(async (failure: Record<string, unknown>) => {
      alerts.push(failure);
    }),
  }));

  vi.resetModules();
  const mod = await import("./route");
  return { POST: mod.POST as unknown as RoutePost, mocks: { alerts, ingest } };
}

function signedRequest(body: string, { sign = true }: { sign?: boolean } = {}): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  headers[WEBHOOK_SIGNATURE_HEADER] = sign
    ? computeWebhookSignature(new TextEncoder().encode(body), SIGNING_KEY)
    : "f".repeat(64);
  return new Request(`http://localhost/api/v1/triage/${ORG_ID}`, {
    method: "POST",
    headers,
    body,
  });
}

function ctx(organizationId = ORG_ID) {
  return { params: Promise.resolve({ organization_id: organizationId }) };
}

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

    const logged = error.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(logged).toContain("[webhook-triage-failure]");
    expect(logged).toContain(ORG_ID);
    expect(logged).not.toContain(SIGNING_KEY);
    expect(logged).not.toContain(sentSignature);
    // ...and no PII from the enquiry body either.
    expect(logged).not.toContain(VALID_PAYLOAD.email);
    expect(logged).not.toContain(VALID_PAYLOAD.client_name);
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
    const logged = error.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(logged).not.toContain("Alex Rivera");
    error.mockRestore();
  });
});
