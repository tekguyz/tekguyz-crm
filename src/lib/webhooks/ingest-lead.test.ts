// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// The ingest half of the 2026-09-05 failure-visibility work. Every fatal write
// path now throws a coded WebhookIngestionError instead of a bare Error, so
// the route can name the stage in its log line and its operator alert. The
// success path is asserted here too, because "a failure alert must never fire
// on a healthy ingestion" is only meaningful if the healthy path still does
// exactly what it did before: one new-lead notification, nothing else.

const ORG_ID = "11111111-2222-3333-4444-555555555555";

const PAYLOAD = {
  client_name: "Alex Rivera",
  email: "alex@rivera-stone.example",
  message: "Need a quote for a kitchen worktop.",
};

type Results = {
  leadLookup?: { data: unknown; error: { message: string } | null };
  leadInsert?: { data: unknown; error: { message: string } | null };
  submissionInsert?: { data: unknown; error: { message: string } | null };
  activityInsert?: { error: { message: string } | null };
};

const LEAD_ROW = { id: "lead-1", client_name: "Alex Rivera", company: null, service_category: null };
const SUBMISSION_ROW = {
  id: "sub-1",
  client_name: "Alex Rivera",
  email: PAYLOAD.email,
  message: PAYLOAD.message,
};

function makeClient(results: Results) {
  const r: Required<Results> = {
    leadLookup: results.leadLookup ?? { data: null, error: null },
    leadInsert: results.leadInsert ?? { data: LEAD_ROW, error: null },
    submissionInsert: results.submissionInsert ?? { data: SUBMISSION_ROW, error: null },
    activityInsert: results.activityInsert ?? { error: null },
  };

  const from = vi.fn((table: string) => {
    // One chainable, awaitable stub per table. `then` covers the one call that
    // awaits the builder directly (the activity_logs insert); everything else
    // terminates in single()/maybeSingle().
    const builder: Record<string, unknown> = {};
    Object.assign(builder, {
      select: () => builder,
      eq: () => builder,
      update: () => builder,
      insert: () => builder,
      maybeSingle: () => Promise.resolve(r.leadLookup),
      single: () =>
        Promise.resolve(table === "lead_submissions" ? r.submissionInsert : r.leadInsert),
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(r.activityInsert).then(resolve, reject),
    });
    return builder;
  });

  return { from };
}

async function loadIngest(results: Results) {
  const notify = vi.fn(async () => {});
  const client = makeClient(results);

  // The module under test and its neighbours are `server-only`; that package
  // throws the moment it is imported outside a React Server Component, which
  // includes a vitest run. Stubbing it is what makes this file hermetic.
  vi.doMock("server-only", () => ({}));
  vi.doMock("@/lib/supabase/service-role", () => ({
    createWebhookServiceClient: () => client,
  }));
  vi.doMock("@/lib/credentials/resolve-org-credential", () => ({
    // No Gemini credential: the Spam Shield fails open and writes its own
    // SYSTEM_ALERT, exactly as in production for a tenant with no BYO key.
    resolveOrgCredential: vi.fn(async () => ({ value: null })),
  }));
  vi.doMock("@/lib/email/notify-new-lead", () => ({ sendNewLeadNotification: notify }));

  vi.resetModules();
  const mod = await import("@/lib/webhooks/ingest-lead");
  return { ingestWebhookLead: mod.ingestWebhookLead, notify };
}

describe("ingestWebhookLead — coded failures", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("throws a coded error naming the stage when the lead insert fails", async () => {
    const { ingestWebhookLead } = await loadIngest({
      leadInsert: { data: null, error: { message: "connection terminated unexpectedly" } },
    });

    await expect(ingestWebhookLead(ORG_ID, PAYLOAD)).rejects.toMatchObject({
      name: "WebhookIngestionError",
      code: "WEBHOOK_LEAD_INSERT_FAILED",
      stage: "lead insert",
      message: "connection terminated unexpectedly",
    });
  });

  it("throws a coded error when the submission write fails", async () => {
    const { ingestWebhookLead } = await loadIngest({
      submissionInsert: { data: null, error: { message: "lead_submissions insert rejected" } },
    });

    await expect(ingestWebhookLead(ORG_ID, PAYLOAD)).rejects.toMatchObject({
      code: "WEBHOOK_SUBMISSION_WRITE_FAILED",
      stage: "submission write",
    });
  });

  it("throws a coded error when the lead lookup fails", async () => {
    const { ingestWebhookLead } = await loadIngest({
      leadLookup: { data: null, error: { message: "statement timeout" } },
    });

    await expect(ingestWebhookLead(ORG_ID, PAYLOAD)).rejects.toMatchObject({
      code: "WEBHOOK_LEAD_LOOKUP_FAILED",
      stage: "lead lookup",
    });
  });

  it("a successful ingestion sends exactly one new-lead notification and logs no failure", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { ingestWebhookLead, notify } = await loadIngest({});

    const result = await ingestWebhookLead(ORG_ID, PAYLOAD);

    expect(result).toEqual({ leadId: "lead-1", submissionId: "sub-1" });
    expect(notify).toHaveBeenCalledTimes(1);
    // Unchanged contract: org id, the lead row, and a null spam reason.
    expect(notify.mock.calls[0]).toEqual([ORG_ID, LEAD_ROW, null]);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
