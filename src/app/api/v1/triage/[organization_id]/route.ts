import { NextResponse, type NextRequest } from "next/server";
import { getOrgSigningKey } from "@/lib/webhooks/resolve-tenant";
import { WEBHOOK_SIGNATURE_HEADER, verifyWebhookSignature } from "@/lib/webhooks/signature";
import { isRateLimited, WEBHOOK_RATE_LIMIT_PER_MINUTE } from "@/lib/webhooks/rate-limit";
import { webhookPayloadSchema } from "@/lib/validation/webhook-payload-schema";
import { ingestWebhookLead } from "@/lib/webhooks/ingest-lead";
import { CORS_HEADERS } from "@/lib/webhooks/cors";
import {
  logWebhookFailure,
  toWebhookFailure,
  WEBHOOK_ERROR_CODES,
  type WebhookFailure,
} from "@/lib/webhooks/ingestion-failure";
import { sendIngestionFailureAlert } from "@/lib/email/alert-ingestion-failure";

// node:crypto is required for the HMAC check, so this route must not be moved
// to the Edge runtime. App Router routes default to Node — this is a note for
// anyone tempted to add `export const runtime = "edge"` later.

// Preflight: a browser sends this before the real POST whenever the request
// carries a Content-Type: application/json body cross-origin. No tenant
// resolution and no signature check here — the preflight never includes the
// real body, so there is nothing to verify yet.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// One shared rejection for every authentication failure — unknown org id,
// missing header, malformed signature, wrong signature. THE ORGANIZATION ID IN
// THE URL GRANTS NO ACCESS ON ITS OWN. A request carrying a perfectly valid
// org id with no valid signature is rejected identically to one carrying an
// org id that does not exist: same status, same body, no hint about which half
// failed. That is the whole reason it was safe to move the id into the URL in
// place of the secret.
function unauthorized(organizationId: string, stage: string) {
  // WARN, never ERROR, and never an alert (2026-09-05). This endpoint is
  // public and is scanned constantly, so a bad or missing signature is
  // expected background noise. Paging a human on it would make the whole
  // channel ignorable within a day — which is the failure mode this
  // observability work exists to prevent. The line is still structured, so the
  // volume is measurable if it ever needs to be.
  logWebhookFailure(
    {
      code: WEBHOOK_ERROR_CODES.AUTH_FAILED,
      organizationId,
      stage,
      // No signature value, no secret, not even a length — nothing about the
      // credential travels into a log line on this path.
    },
    "warn",
  );
  return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
}

// Everything past signature verification: one structured error line AND an
// operator email. A signature-valid request that fails is a real lead that did
// not arrive, and the only person who would otherwise notice is the client who
// sent it. Same principle as the classifier-verdict rule — a failure signal
// routes to a human, it is never quietly absorbed.
async function reportAuthenticatedFailure(failure: WebhookFailure): Promise<void> {
  logWebhookFailure(failure);
  await sendIngestionFailureAlert(failure);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organization_id: string }> },
) {
  const { organization_id } = await params;

  // RAW BYTES, read before anything parses them. Signing must happen over the
  // exact octets that crossed the wire: a parsed-then-re-serialized body is
  // not guaranteed byte-identical (key order, whitespace, unicode escaping),
  // so verifying against JSON.stringify(parsed) would reject every legitimate
  // caller. arrayBuffer() is also the only read that survives a body which is
  // not valid JSON at all — the signature check must not depend on parseability.
  const rawBody = new Uint8Array(await request.arrayBuffer());

  const signingKey = await getOrgSigningKey(organization_id);
  if (!signingKey) {
    return unauthorized(organization_id, "tenant resolution");
  }

  const signature = request.headers.get(WEBHOOK_SIGNATURE_HEADER);
  if (!verifyWebhookSignature(rawBody, signingKey, signature)) {
    return unauthorized(organization_id, "signature verification");
  }

  // Everything below this line runs only for a request proven to come from a
  // holder of this tenant's signing key. Rate limiting sits AFTER verification
  // on purpose: an unauthenticated caller must not be able to make the route
  // spend a database round-trip.
  if (await isRateLimited(organization_id)) {
    // Logged, not alerted: the caller is authenticated, but this is a caller
    // behaviour problem with an explicit 429 telling them so — nothing was
    // lost that a retry cannot recover.
    logWebhookFailure(
      {
        code: WEBHOOK_ERROR_CODES.RATE_LIMITED,
        organizationId: organization_id,
        stage: "rate limit",
        detail: `over ${WEBHOOK_RATE_LIMIT_PER_MINUTE}/min`,
      },
      "warn",
    );
    return NextResponse.json(
      { error: `Rate limit exceeded (max ${WEBHOOK_RATE_LIMIT_PER_MINUTE}/min)` },
      { status: 429, headers: { ...CORS_HEADERS, "Retry-After": "60" } },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    // Alerted, not just logged. The only caller holding a valid signing key is
    // our own site's contact form, so a body it cannot serialise is a bug on
    // our side and a real enquiry was lost with it.
    await reportAuthenticatedFailure({
      code: WEBHOOK_ERROR_CODES.INVALID_JSON,
      organizationId: organization_id,
      stage: "body parse",
      // The body itself is never logged — it is unparsed attacker-or-bug input
      // and would carry the enquiry's PII straight into stderr.
      detail: "request body is not valid JSON",
    });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS_HEADERS });
  }

  const parsed = webhookPayloadSchema.safeParse(body);
  if (!parsed.success) {
    // Field NAMES only. flatten().fieldErrors keys are the schema's own column
    // names; the values are zod messages that can quote the submitted content,
    // so they stay in the HTTP response to the signed caller and out of the log.
    await reportAuthenticatedFailure({
      code: WEBHOOK_ERROR_CODES.INVALID_PAYLOAD,
      organizationId: organization_id,
      stage: "payload validation",
      detail: `invalid fields: ${Object.keys(parsed.error.flatten().fieldErrors).join(", ") || "unknown"}`,
    });
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten().fieldErrors },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  let leadId: string;
  try {
    ({ leadId } = await ingestWebhookLead(organization_id, parsed.data));
  } catch (err) {
    // Before 2026-09-05 this throw was uncaught, so Next produced a bare 500
    // and nothing else — no log line naming the tenant, no email, no record
    // that a real enquiry had been dropped. The status is unchanged (still
    // 500); what is new is that a human hears about it.
    await reportAuthenticatedFailure(toWebhookFailure(organization_id, err));
    return NextResponse.json(
      { error: "Lead ingestion failed" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  return NextResponse.json({ success: true, leadId }, { status: 200, headers: CORS_HEADERS });
}
