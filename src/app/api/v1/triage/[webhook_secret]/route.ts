import { NextResponse, type NextRequest } from "next/server";
import { resolveOrgBySecret } from "@/lib/webhooks/resolve-tenant";
import { isRateLimited, WEBHOOK_RATE_LIMIT_PER_MINUTE } from "@/lib/webhooks/rate-limit";
import { webhookPayloadSchema } from "@/lib/validation/webhook-payload-schema";
import { ingestWebhookLead } from "@/lib/webhooks/ingest-lead";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ webhook_secret: string }> },
) {
  const { webhook_secret } = await params;

  // Unknown/malformed secret: generic 404, no hint about which part failed.
  const organizationId = await resolveOrgBySecret(webhook_secret);
  if (!organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (await isRateLimited(organizationId)) {
    return NextResponse.json(
      { error: `Rate limit exceeded (max ${WEBHOOK_RATE_LIMIT_PER_MINUTE}/min)` },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = webhookPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { leadId } = await ingestWebhookLead(organizationId, parsed.data);

  return NextResponse.json({ success: true, leadId }, { status: 200 });
}
