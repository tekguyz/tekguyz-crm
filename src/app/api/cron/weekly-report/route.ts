import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateOrgRevenue } from "@/lib/reports/aggregate-org-revenue";
import { generateExecutiveNarrative } from "@/lib/reports/generate-executive-narrative";
import { sendWeeklyReport } from "@/lib/email/send-weekly-report";

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
    return NextResponse.json({ processed: 0, failed: 0 }, { status: 200 });
  }

  let processed = 0;
  let failed = 0;

  // Each iteration is fully isolated — one organization_id fetched,
  // aggregated, narrated, and sent per pass, never batched across orgs. A
  // failure anywhere in one org's pipeline (missing credential, a Gemini
  // timeout, a Resend error) is caught right here so it can never abort the
  // rest of the run; it's logged and the loop moves on.
  for (const org of organizations) {
    try {
      const aggregatedData = await aggregateOrgRevenue(org.id);
      const narrative = await generateExecutiveNarrative(org.id, aggregatedData);
      await sendWeeklyReport(org.id, aggregatedData, narrative);
      processed += 1;
    } catch (err) {
      failed += 1;
      console.error(`[weekly-report cron] failed to process org ${org.id}:`, err);
    }
  }

  return NextResponse.json({ processed, failed }, { status: 200 });
}
