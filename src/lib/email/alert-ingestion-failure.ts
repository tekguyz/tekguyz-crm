import "server-only";
import { Resend } from "resend";
import { resolveOrgCredential } from "@/lib/credentials/resolve-org-credential";
import { getOwnerAdminRecipients } from "@/lib/email/recipients";
import { NOTIFICATION_FROM } from "@/lib/email/notify-new-lead";
import type { WebhookFailure } from "@/lib/webhooks/ingestion-failure";

/**
 * Operator alert for a webhook ingestion failure (2026-09-05).
 *
 * Fires ONLY for a request that already passed signature verification — i.e.
 * a caller holding this tenant's signing key sent us something we then failed
 * to persist. A 401 never reaches here: an unsigned or wrongly-signed request
 * is constant background scanning noise, and alerting on it would make the
 * channel useless within a day.
 *
 * Reuses the existing Resend integration exactly as notify-new-lead.ts does —
 * same credential (`token_resend`), same OWNER/ADMIN recipient resolution,
 * same From address. No second client configuration, no new vendor.
 *
 * Never throws. The caller is already on a failure path; an alert that could
 * itself explode would replace one silent failure with another.
 *
 * The email body carries the org id, the error code, the stage and the error
 * text — and nothing else. No signing key, no signature header, no payload
 * field. See lib/webhooks/ingestion-failure.ts for that rule in full.
 */
export async function sendIngestionFailureAlert(failure: WebhookFailure): Promise<void> {
  try {
    const { value: apiKey } = await resolveOrgCredential(failure.organizationId, "token_resend");
    if (!apiKey) {
      console.error(
        `[sendIngestionFailureAlert] no Resend credential configured (org or platform) — cannot alert on ${failure.code} for org ${failure.organizationId}`,
      );
      return;
    }

    // Reuses the new-lead recipient list on purpose: the people who would have
    // received the lead are exactly the people who need to know it never
    // arrived. A separate opt-out flag would be a schema change, and this
    // prompt ships no migration.
    const recipients = await getOwnerAdminRecipients(failure.organizationId, "new_lead");
    if (!recipients.length) {
      console.error(
        `[sendIngestionFailureAlert] no OWNER/ADMIN recipients for org ${failure.organizationId} — cannot alert on ${failure.code}`,
      );
      return;
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: NOTIFICATION_FROM,
      to: recipients,
      subject: `[Action needed] Inbound lead failed to save (${failure.code})`,
      html: renderAlertHtml(failure),
    });

    if (error) {
      console.error(
        `[sendIngestionFailureAlert] Resend send failed for org ${failure.organizationId} (${failure.code}):`,
        error,
      );
    }
  } catch (err) {
    console.error(
      `[sendIngestionFailureAlert] threw while alerting on ${failure.code} for org ${failure.organizationId}:`,
      err,
    );
  }
}

function renderAlertHtml(failure: WebhookFailure): string {
  const rows = [
    ["Organization", failure.organizationId],
    ["Error code", failure.code],
    ["Stage", failure.stage],
    ["Detail", failure.detail ?? "(none)"],
    ["When", new Date().toISOString()],
  ];

  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
      <p style="margin: 0 0 4px; font-size: 13px; color: #7a7a7a;">Inbound webhook</p>
      <h1 style="margin: 0 0 8px; font-size: 20px; color: #111;">A lead did not save</h1>
      <p style="margin: 0 0 20px; font-size: 14px; color: #666;">
        A correctly signed request reached the triage endpoint and then failed. The enquiry is not in the CRM.
        Ask the sender to resubmit once this is fixed.
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #333;">
        ${rows
          .map(
            ([label, value]) =>
              `<tr>
                 <td style="padding: 6px 12px 6px 0; color: #7a7a7a; white-space: nowrap; vertical-align: top;">${escapeHtml(label)}</td>
                 <td style="padding: 6px 0; font-family: ui-monospace, Menlo, Consolas, monospace; word-break: break-word;">${escapeHtml(value)}</td>
               </tr>`,
          )
          .join("")}
      </table>
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
