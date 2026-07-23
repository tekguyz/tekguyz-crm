import "server-only";
import { Resend } from "resend";
import { resolveOrgCredential } from "@/lib/credentials/resolve-org-credential";
import { getOwnerAdminRecipients } from "@/lib/email/recipients";
import { trimTrailingSlash } from "@/lib/utils/trim-trailing-slash";
import type { Lead } from "@/lib/leads/queries";

// Falls back to localhost for local/dev testing — must be set for a real
// deployment, or the deep link in the notification email points nowhere
// useful. Trailing slash stripped (Prompt 15a) — this was the one file the
// Prompt 14 fix didn't reach; it produced the exact double-slash deep-link
// bug send-weekly-report.ts already had fixed, just never verified here.
const APP_URL = trimTrailingSlash(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
const NOTIFICATION_FROM = "TEKGUYZ CRM <onboarding@resend.dev>";

// Fire-and-forget from the caller's perspective — ingest-lead.ts wraps this
// call so a failure here never fails the webhook response; the lead is
// already safely in the database by the time this runs.
export async function sendNewLeadNotification(organizationId: string, lead: Lead): Promise<void> {
  const { value: apiKey } = await resolveOrgCredential(organizationId, "token_resend");
  if (!apiKey) {
    console.error(
      `[sendNewLeadNotification] no Resend credential configured (org or platform) — skipping email for lead ${lead.id}`,
    );
    return;
  }

  const recipients = await getOwnerAdminRecipients(organizationId);
  if (!recipients.length) {
    console.error(
      `[sendNewLeadNotification] no OWNER/ADMIN recipients found for org ${organizationId} — skipping email for lead ${lead.id}`,
    );
    return;
  }

  const deepLink = `${APP_URL}/?leadId=${lead.id}`;
  const subtitle = [lead.company, lead.service_category].filter(Boolean).join(" · ");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: NOTIFICATION_FROM,
    to: recipients,
    subject: `New lead: ${lead.client_name}`,
    html: renderEmailHtml({ clientName: lead.client_name, subtitle, deepLink }),
  });

  if (error) {
    console.error(`[sendNewLeadNotification] Resend send failed for lead ${lead.id}:`, error);
  }
}

function renderEmailHtml({
  clientName,
  subtitle,
  deepLink,
}: {
  clientName: string;
  subtitle: string;
  deepLink: string;
}): string {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <p style="margin: 0 0 4px; font-size: 13px; color: #7a7a7a;">New lead</p>
      <h1 style="margin: 0 0 8px; font-size: 20px; color: #111;">${escapeHtml(clientName)}</h1>
      ${subtitle ? `<p style="margin: 0 0 24px; font-size: 14px; color: #666;">${escapeHtml(subtitle)}</p>` : ""}
      <a href="${deepLink}" style="display: inline-block; padding: 10px 20px; background: #2451e0; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
        View lead
      </a>
    </div>
  `.trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
