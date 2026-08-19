import { createClient } from "@/lib/supabase/server";
import {
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  type PipelineStatus,
} from "@/lib/leads/pipeline";

export type StageRow = {
  status: string;
  label: string;
  count: number;
  value: number;
  // 0–1 of the open pipeline's total value, 0 when the pipeline is empty.
  share: number;
};

export type OutcomeKey = "WON" | "LOST" | "ABANDONED";

export type OutcomeRow = {
  outcome: OutcomeKey;
  count: number;
  revenue: number;
};

export type PipelineReport = {
  stages: StageRow[];
  openCount: number;
  openValue: number;
  outcomes: OutcomeRow[];
  realizedRevenue: number;
  wonCount: number;
  lostCount: number;
  abandonedCount: number;
  // WON / (WON + LOST) as 0–1, or null when nothing has been decided yet —
  // null is not 0, and the view says "No decided leads yet" rather than "0%".
  winRate: number | null;
};

const OUTCOME_ORDER: OutcomeKey[] = ["WON", "LOST", "ABANDONED"];

// Aggregated in JS, not SQL. PostgREST has no GROUP BY, and the alternatives
// (a SECURITY DEFINER RPC, a materialised view) are both schema work for row
// counts that are small by design — see docs/KNOWN_GAPS.md's scale notes. Two
// SELECTs of two columns each is cheaper than either.
//
// The two halves deliberately filter differently, matching the definitions the
// weekly cron already uses in lib/reports/aggregate-org-revenue.ts:
//   open  — outcome IS NULL AND archived = false. An archived lead is one a
//           human removed; it is not still in play, so it is not pipeline.
//   closed— outcome IS NOT NULL, archived NOT filtered. A won deal stays won
//           after someone tidies it out of the directory, and dropping it
//           would silently shrink realized revenue.
// Both are scoped by organization_id on top of RLS, the same belt-and-braces
// every other lead query here uses.
export async function getPipelineReport(orgId: string): Promise<PipelineReport> {
  const supabase = await createClient();

  const [open, closed] = await Promise.all([
    supabase
      .from("leads")
      .select("status, estimated_revenue")
      .eq("organization_id", orgId)
      .eq("archived", false)
      .is("outcome", null),
    supabase
      .from("leads")
      .select("outcome, actual_revenue")
      .eq("organization_id", orgId)
      .not("outcome", "is", null),
  ]);

  if (open.error) throw open.error;
  if (closed.error) throw closed.error;

  const counts = new Map<string, number>();
  const values = new Map<string, number>();

  for (const row of open.data) {
    const status = row.status as string;
    counts.set(status, (counts.get(status) ?? 0) + 1);
    values.set(status, (values.get(status) ?? 0) + Number(row.estimated_revenue ?? 0));
  }

  // The four known stages always render, in board order, even at zero — a
  // stage missing from the table reads as "no such stage", not "nothing here".
  // Anything else the column happens to hold is appended rather than dropped,
  // so the stage rows always sum to the total printed beneath them.
  const extraStatuses = [...counts.keys()]
    .filter((s) => !(PIPELINE_STATUSES as readonly string[]).includes(s))
    .sort();
  const orderedStatuses: string[] = [...PIPELINE_STATUSES, ...extraStatuses];

  const openValue = [...values.values()].reduce((sum, v) => sum + v, 0);
  const openCount = open.data.length;

  const stages: StageRow[] = orderedStatuses.map((status) => {
    const value = values.get(status) ?? 0;
    return {
      status,
      label: PIPELINE_STATUS_LABELS[status as PipelineStatus] ?? status,
      count: counts.get(status) ?? 0,
      value,
      share: openValue > 0 ? value / openValue : 0,
    };
  });

  const outcomeCounts = new Map<OutcomeKey, number>();
  const outcomeRevenue = new Map<OutcomeKey, number>();

  for (const row of closed.data) {
    const outcome = row.outcome as OutcomeKey;
    if (!OUTCOME_ORDER.includes(outcome)) continue;
    outcomeCounts.set(outcome, (outcomeCounts.get(outcome) ?? 0) + 1);
    outcomeRevenue.set(
      outcome,
      (outcomeRevenue.get(outcome) ?? 0) + Number(row.actual_revenue ?? 0),
    );
  }

  const outcomes: OutcomeRow[] = OUTCOME_ORDER.map((outcome) => ({
    outcome,
    count: outcomeCounts.get(outcome) ?? 0,
    revenue: outcomeRevenue.get(outcome) ?? 0,
  }));

  const wonCount = outcomeCounts.get("WON") ?? 0;
  const lostCount = outcomeCounts.get("LOST") ?? 0;
  const abandonedCount = outcomeCounts.get("ABANDONED") ?? 0;
  const decided = wonCount + lostCount;

  return {
    stages,
    openCount,
    openValue,
    outcomes,
    realizedRevenue: outcomeRevenue.get("WON") ?? 0,
    wonCount,
    lostCount,
    abandonedCount,
    winRate: decided > 0 ? wonCount / decided : null,
  };
}
