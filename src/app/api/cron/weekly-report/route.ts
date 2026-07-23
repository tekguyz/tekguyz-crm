import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateOrgRevenue } from "@/lib/reports/aggregate-org-revenue";
import { generateExecutiveNarrative } from "@/lib/reports/generate-executive-narrative";
import { sendWeeklyReport } from "@/lib/email/send-weekly-report";
import { getCurrentWeekStart, hasReportBeenSentThisWeek, recordReportSent } from "@/lib/reports/report-sends";

// Thin orchestrator only: auth check, fetch the org list, loop with a
// per-org try/catch. No aggregation/narrative/email logic lives here — that
// stays in lib/reports/* and lib/email/send-weekly-report.ts.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: organizations, error } = await supabase.from("organizations").select("id");

  if (error) {
    console.error("[weekly-report cron] failed to list organizations:", error);
    return NextResponse.json({ error: "Failed to list organizations" }, { status: 500 });
  }

  if (!organizations?.length) {
    console.log("[weekly-report cron] no organizations exist — nothing to report");
    return NextResponse.json({ processed: 0, skipped: 0, failed: 0 }, { status: 200 });
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const weekStart = getCurrentWeekStart();

  // Each iteration is fully isolated — one organization_id fetched,
  // aggregated, narrated, and sent per pass, never batched across orgs. A
  // failure anywhere in one org's pipeline (missing credential, a Gemini
  // timeout, a Resend error) is caught right here so it can never abort the
  // rest of the run; it's logged and the loop moves on.
  //
  // The report_sends check below is the idempotency guard added in Prompt
  // 15a: a manual re-trigger (Vercel Cron dashboard's "Run" button, or any
  // duplicate invocation) within the same ISO week now no-ops per org
  // instead of sending a second live email — see report-sends.ts.
  for (const org of organizations) {
    try {
      const alreadySent = await hasReportBeenSentThisWeek(org.id, weekStart);
      if (alreadySent) {
        skipped += 1;
        console.log(`[weekly-report cron] report already sent for org ${org.id}, week ${weekStart} — skipping`);
        continue;
      }

      const aggregatedData = await aggregateOrgRevenue(org.id);
      const narrative = await generateExecutiveNarrative(org.id, aggregatedData);
      await sendWeeklyReport(org.id, aggregatedData, narrative);
      await recordReportSent(org.id, weekStart);
      processed += 1;
    } catch (err) {
      failed += 1;
      console.error(`[weekly-report cron] failed to process org ${org.id}:`, err);
    }
  }

  return NextResponse.json({ processed, skipped, failed }, { status: 200 });
}
