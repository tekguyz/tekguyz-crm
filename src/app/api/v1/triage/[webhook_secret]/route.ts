import { NextResponse, type NextRequest } from "next/server";
import { resolveOrgBySecret } from "@/lib/webhooks/resolve-tenant";
import { isRateLimited, WEBHOOK_RATE_LIMIT_PER_MINUTE } from "@/lib/webhooks/rate-limit";
import { webhookPayloadSchema } from "@/lib/validation/webhook-payload-schema";
import { ingestWebhookLead } from "@/lib/webhooks/ingest-lead";
import { CORS_HEADERS } from "@/lib/webhooks/cors";

// Preflight: a browser sends this before the real POST whenever the request
// carries a Content-Type: application/json body cross-origin (the contact
// form's case). No secret/tenant resolution here — the preflight never
// includes the real body, so there's nothing to validate yet.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ webhook_secret: string }> },
) {
  const { webhook_secret } = await params;

  // Unknown/malformed secret: generic 404, no hint about which part failed.
  const organizationId = await resolveOrgBySecret(webhook_secret);
  if (!organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });
  }

  if (await isRateLimited(organizationId)) {
    return NextResponse.json(
      { error: `Rate limit exceeded (max ${WEBHOOK_RATE_LIMIT_PER_MINUTE}/min)` },
      { status: 429, headers: { ...CORS_HEADERS, "Retry-After": "60" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
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

  const { leadId } = await ingestWebhookLead(organizationId, parsed.data);

  return NextResponse.json({ success: true, leadId }, { status: 200, headers: CORS_HEADERS });
}
