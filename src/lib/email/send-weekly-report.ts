import "server-only";
import { Resend } from "resend";
import { resolveOrgCredential } from "@/lib/credentials/resolve-org-credential";
import { getOwnerAdminRecipients } from "@/lib/email/recipients";
import type { OrgRevenueAggregate } from "@/lib/reports/aggregate-org-revenue";

// Falls back to localhost for local/dev testing — same env-var gap as
// notify-new-lead.ts; must be set for a real deployment. Trailing slash
// stripped so `${APP_URL}/` below always produces exactly one slash,
// regardless of whether the env var itself has one (it does, in this
// project's Vercel scope).
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const REPORT_FROM = "TEKGUYZ CRM <onboarding@resend.dev>";

// The only place Resend gets called in this feature. Plain text, not
// markdown-rendered HTML, by deliberate decision: this is an internal ops
// email where readability matters more than polish, and rendering markdown
// server-side (outside a React render tree) would need a second dependency
// or a renderToStaticMarkup detour for a payoff that doesn't matter yet.
export async function sendWeeklyReport(
  organizationId: string,
  aggregatedData: OrgRevenueAggregate,
  narrative: string | null,
): Promise<void> {
  const { value: apiKey } = await resolveOrgCredential(organizationId, "token_resend");
  if (!apiKey) {
    console.error(
      `[sendWeeklyReport] no Resend credential configured (org or platform) — skipping weekly report for org ${organizationId}`,
    );
    return;
  }

  const recipients = await getOwnerAdminRecipients(organizationId);
  if (!recipients.length) {
    console.error(
      `[sendWeeklyReport] no OWNER/ADMIN recipients found for org ${organizationId} — skipping weekly report`,
    );
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: REPORT_FROM,
    to: recipients,
    subject: `Weekly revenue report — ${formatMonthLabel(aggregatedData.monthStart)}`,
    text: buildReportBody(aggregatedData, narrative),
  });

  if (error) {
    console.error(`[sendWeeklyReport] Resend send failed for org ${organizationId}:`, error);
  }
}

// Explicit "quiet month" wording rather than an empty/omitted section — this
// app's standing pattern is honest empty states over silent omission (see
// the Contacts directory scope decision in CLAUDE.md).
function buildReportBody(data: OrgRevenueAggregate, narrative: string | null): string {
  const isQuiet =
    data.realizedRevenue === 0 && data.openCount === 0 && data.lostCount === 0 && data.abandonedCount === 0;

  const lines = [
    `Weekly revenue report — ${formatMonthLabel(data.monthStart)}`,
    "",
    `Realized this month: $${data.realizedRevenue.toLocaleString()} (${data.wonCount} won)`,
    `Pipeline (open): $${data.projectedRevenue.toLocaleString()} (${data.openCount} open)`,
    `Lost: ${data.lostCount} · Abandoned: ${data.abandonedCount}`,
    "",
    narrative ??
      (isQuiet
        ? "Quiet month so far — no closed, lost, or open activity recorded yet. (AI summary unavailable this week; the numbers above are accurate regardless.)"
        : "AI summary unavailable this week — no Gemini credential configured, or the request failed. The numbers above are accurate regardless."),
    "",
    `View pipeline: ${APP_URL}/`,
  ];

  return lines.join("\n");
}

function formatMonthLabel(monthStartIso: string): string {
  return new Date(monthStartIso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
