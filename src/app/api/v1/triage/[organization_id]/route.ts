import { NextResponse, type NextRequest } from "next/server";
import { getOrgSigningKey } from "@/lib/webhooks/resolve-tenant";
import { WEBHOOK_SIGNATURE_HEADER, verifyWebhookSignature } from "@/lib/webhooks/signature";
import { isRateLimited, WEBHOOK_RATE_LIMIT_PER_MINUTE } from "@/lib/webhooks/rate-limit";
import { webhookPayloadSchema } from "@/lib/validation/webhook-payload-schema";
import { ingestWebhookLead } from "@/lib/webhooks/ingest-lead";
import { CORS_HEADERS } from "@/lib/webhooks/cors";

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
function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
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
    return unauthorized();
  }

  const signature = request.headers.get(WEBHOOK_SIGNATURE_HEADER);
  if (!verifyWebhookSignature(rawBody, signingKey, signature)) {
    return unauthorized();
  }

  // Everything below this line runs only for a request proven to come from a
  // holder of this tenant's signing key. Rate limiting sits AFTER verification
  // on purpose: an unauthenticated caller must not be able to make the route
  // spend a database round-trip.
  if (await isRateLimited(organization_id)) {
    return NextResponse.json(
      { error: `Rate limit exceeded (max ${WEBHOOK_RATE_LIMIT_PER_MINUTE}/min)` },
      { status: 429, headers: { ...CORS_HEADERS, "Retry-After": "60" } },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS_HEADERS });
  }

  const parsed = webhookPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten().fieldErrors },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const { leadId } = await ingestWebhookLead(organization_id, parsed.data);

  return NextResponse.json({ success: true, leadId }, { status: 200, headers: CORS_HEADERS });
}
