import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type OrgRevenueAggregate = {
  organizationId: string;
  monthStart: string;
  monthEnd: string;
  realizedRevenue: number;
  wonCount: number;
  projectedRevenue: number;
  openCount: number;
  lostCount: number;
  abandonedCount: number;
};

function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

// Pure data-in/data-out aggregation: no AI calls, no email sends. Always
// explicitly scoped by organization_id on every query — this is called once
// per iteration of the cron's per-org loop under the service-role client, so
// an unscoped or cross-joined query here would be a cross-tenant data leak,
// not just a bug. Never batch this across organizations.
export async function aggregateOrgRevenue(organizationId: string): Promise<OrgRevenueAggregate> {
  const supabase = createAdminClient();
  const { start, end } = getCurrentMonthRange();

  const [won, open, lost, abandoned] = await Promise.all([
    supabase
      .from("leads")
      .select("actual_revenue")
      .eq("organization_id", organizationId)
      .eq("outcome", "WON")
      .gte("closed_at", start)
      .lt("closed_at", end),
    supabase
      .from("leads")
      .select("estimated_revenue")
      .eq("organization_id", organizationId)
      .is("outcome", null)
      .eq("archived", false),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("outcome", "LOST")
      .gte("closed_at", start)
      .lt("closed_at", end),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("outcome", "ABANDONED")
      .gte("closed_at", start)
      .lt("closed_at", end),
  ]);

  if (won.error) throw new Error(won.error.message);
  if (open.error) throw new Error(open.error.message);
  if (lost.error) throw new Error(lost.error.message);
  if (abandoned.error) throw new Error(abandoned.error.message);

  const realizedRevenue = won.data.reduce((sum, row) => sum + Number(row.actual_revenue ?? 0), 0);
  const projectedRevenue = open.data.reduce((sum, row) => sum + Number(row.estimated_revenue ?? 0), 0);

  return {
    organizationId,
    monthStart: start,
    monthEnd: end,
    realizedRevenue,
    wonCount: won.data.length,
    projectedRevenue,
    openCount: open.data.length,
    lostCount: lost.count ?? 0,
    abandonedCount: abandoned.count ?? 0,
  };
}
