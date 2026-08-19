import { getCurrentOrg } from "@/lib/organizations/current";
import { getPipelineReport } from "@/lib/leads/report-queries";
import { formatCurrency } from "@/lib/format";
import { Figure } from "@/components/reports/Figure";
import { StageLedger } from "@/components/reports/StageLedger";
import { OutcomeLedger } from "@/components/reports/OutcomeLedger";
import { Card } from "@/components/ui/Card";

// Read-only, all-time, whole-tenant. No role gate: every MEMBER already sees
// every lead in the org (see CLAUDE.md § Multi-Tenant Security Model), so an
// aggregate of those same rows may not be narrower or wider than the lists
// they can already read. RLS is the boundary; this page adds none of its own.
export default async function ReportsPage() {
  const { orgId, orgName, currencyFormat } = await getCurrentOrg();
  const report = await getPipelineReport(orgId);

  const decided = report.wonCount + report.lostCount;
  const hasAnyLeads = report.openCount > 0 || decided > 0 || report.abandonedCount > 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-h1">Reports</h1>
        <p className="text-body-sm text-ink-muted">
          Every lead {orgName} has ever recorded. There is no date filter yet.
        </p>
      </div>

      {hasAnyLeads ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Figure
              label="Open pipeline"
              value={formatCurrency(report.openValue, currencyFormat)}
              note={`${report.openCount} ${report.openCount === 1 ? "lead" : "leads"} still open`}
            />
            <Figure
              label="Realized revenue"
              value={formatCurrency(report.realizedRevenue, currencyFormat)}
              note={`${report.wonCount} ${report.wonCount === 1 ? "lead" : "leads"} won`}
            />
            <Figure
              label="Win rate"
              value={report.winRate === null ? "—" : `${Math.round(report.winRate * 100)}%`}
              note={
                report.winRate === null
                  ? "No leads decided yet"
                  : `${report.wonCount} won of ${decided} decided`
              }
            />
          </div>

          <StageLedger
            stages={report.stages}
            openCount={report.openCount}
            openValue={report.openValue}
            currencyFormat={currencyFormat}
          />

          <OutcomeLedger outcomes={report.outcomes} currencyFormat={currencyFormat} />

          {/* The formula is stated because it is a judgement call, not an
              obvious one: abandoned leads never reached a decision, so counting
              them as losses would punish a team for a prospect that went quiet.
              Anyone reading a percentage deserves to know what was in the
              denominator. */}
          <p className="text-caption text-ink-muted">
            Win rate is won divided by won plus lost. Abandoned leads are left out of that
            sum, because nobody decided them.
            {report.abandonedCount > 0
              ? ` ${report.abandonedCount} ${
                  report.abandonedCount === 1 ? "lead is" : "leads are"
                } abandoned and excluded.`
              : ""}
          </p>
        </>
      ) : (
        <Card className="p-6">
          <p className="text-body-md">No leads yet.</p>
          <p className="text-body-sm text-ink-muted">
            These figures fill in as leads arrive and you close them.
          </p>
        </Card>
      )}
    </div>
  );
}
