import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations/current";
import { getPipelineReport } from "@/lib/leads/report-queries";
import { parseReportPeriod, resolvePeriodRange } from "@/lib/reports/periods";
import { pipelineReportToCsv, reportCsvFilename } from "@/lib/reports/export-csv";

// The /reports aggregate as a file. Same shape as /api/leads/export, and for
// the same reasons: a route handler so Content-Disposition names a real
// download, and its own auth check because middleware exempts /api/*.
//
// The period is read from `?period=` and resolved exactly as the page resolves
// it — parseReportPeriod, then resolvePeriodRange in the ORG's timezone, then
// the same getPipelineReport call — so the file and the screen cannot disagree
// about which leads a period holds. Read-only; the demo role can use it.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const period = parseReportPeriod(request.nextUrl.searchParams.get("period") ?? undefined);
  const { orgId, orgName, orgTimezone } = await getCurrentOrg();
  const report = await getPipelineReport(orgId, resolvePeriodRange(period, orgTimezone));

  return new NextResponse(pipelineReportToCsv(report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${reportCsvFilename(orgName, period)}"`,
      "Cache-Control": "no-store",
    },
  });
}
