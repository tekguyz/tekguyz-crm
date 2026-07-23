import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// ISO week, Monday-start, computed in UTC — same "instant comparison,
// timezone-agnostic" convention aggregate-org-revenue.ts already uses for
// its month boundary (organizations.timezone exists but nothing reads it for
// date-boundary math yet). The cron itself only ever fires Monday 13:00 UTC
// (vercel.json), so this only actually matters for a manual re-trigger later
// in the same week — which is exactly the case this guard exists for.
export function getCurrentWeekStart(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

export async function hasReportBeenSentThisWeek(organizationId: string, weekStart: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("report_sends")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data !== null;
}

// Called after a successful send. Per the fallback behavior spec: if this
// insert fails (rare — most likely a genuine race where a second overlapping
// invocation already inserted the same org/week first), log loudly rather
// than throw. A missing tracking row risks a future duplicate send, which is
// the exact failure mode this table exists to prevent — but the report has
// already been sent successfully by this point, so surfacing the error as a
// hard failure here would misreport a real send as a cron failure.
export async function recordReportSent(organizationId: string, weekStart: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("report_sends")
    .insert({ organization_id: organizationId, week_start: weekStart });

  if (error) {
    console.error(
      `[report-sends] FAILED to record report_sends row for org ${organizationId}, week ${weekStart} ` +
        `after a successful send — a future cron run this week will not know this report already went out ` +
        `and may re-send it:`,
      error,
    );
  }
}
