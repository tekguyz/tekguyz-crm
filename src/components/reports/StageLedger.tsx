import { IconLayoutKanban } from "@tabler/icons-react";

import { formatCurrency } from "@/lib/format";
import { formatPercent } from "@/lib/reports/percent";
import type { StageRow } from "@/lib/leads/report-queries";
import { StageBadge } from "@/components/leads/StageBadge";
import { ReportPanel } from "@/components/reports/ReportPanel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/TableRow";

// The bar in the SHARE column, in the stage's own pill foreground. It is the
// one place this view spends colour beyond the pill, and it earns it: the
// percentage is already printed beside it, so the bar exists to make the shape
// of the pipeline readable in one glance rather than four comparisons.
const BAR_COLOR: Record<string, string> = {
  NEW: "bg-pill-sky-fg",
  DISCOVERY: "bg-pill-purple-fg",
  QUOTED: "bg-pill-orange-fg",
  ACTIVE: "bg-pill-green-fg",
};

// aria-hidden: the percentage next to it is the accessible value, so a screen
// reader hears the number once.
function ShareBar({ status, share }: { status: string; share: number }) {
  return (
    <div className="flex items-center gap-3">
      <div aria-hidden="true" className="h-1.5 min-w-0 flex-1 rounded-full bg-canvas-soft">
        <div
          className={`h-1.5 rounded-full ${BAR_COLOR[status] ?? "bg-ink-muted"}`}
          style={{ width: formatPercent(share) }}
        />
      </div>
      <span className="text-body-sm w-10 shrink-0 text-right tabular-nums text-ink-muted">
        {formatPercent(share)}
      </span>
    </div>
  );
}

export function StageLedger({
  stages,
  openCount,
  openValue,
  currencyFormat,
}: {
  stages: StageRow[];
  openCount: number;
  openValue: number;
  currencyFormat: string;
}) {
  return (
    <ReportPanel
      id="stage-ledger"
      icon={
        <IconLayoutKanban
          aria-hidden="true"
          size={18}
          stroke={1.75}
          className="text-pill-teal-fg"
        />
      }
      title="Pipeline by stage"
      count={openCount}
      countLabel="open leads"
      description="Estimated revenue of every lead still open. Archived leads are not counted."
    >
      <Table aria-labelledby="stage-ledger-title">
        <TableHead>
          <TableRow>
            <TableHeaderCell scope="col" className="px-4">
              Stage
            </TableHeaderCell>
            <TableHeaderCell scope="col" className="text-right">
              Leads
            </TableHeaderCell>
            <TableHeaderCell scope="col" className="px-4 text-right sm:px-3">
              Value
            </TableHeaderCell>
            <TableHeaderCell scope="col" className="hidden w-[38%] px-4 sm:table-cell">
              Share
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stages.map((stage) => (
            <TableRow key={stage.status}>
              <TableHeaderCell
                scope="row"
                className="px-4 py-2.5 align-middle font-normal text-ink-main"
              >
                <StageBadge status={stage.status} />
                {/* Phone: the Share column is gone (its track was 6px wide), so
                    the bar runs full width under the stage name instead. */}
                <div className="mt-2 sm:hidden">
                  <ShareBar status={stage.status} share={stage.share} />
                </div>
              </TableHeaderCell>
              <TableCell className="py-2.5 text-right align-middle tabular-nums">
                {stage.count}
              </TableCell>
              <TableCell className="px-4 py-2.5 text-right align-middle tabular-nums sm:px-3">
                {formatCurrency(stage.value, currencyFormat)}
              </TableCell>
              <TableCell className="hidden px-4 py-2.5 align-middle sm:table-cell">
                <ShareBar status={stage.status} share={stage.share} />
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-b-0 bg-canvas-soft">
            <TableHeaderCell scope="row" className="text-title px-4 py-2.5">
              Open pipeline
            </TableHeaderCell>
            <TableCell className="text-title py-2.5 text-right tabular-nums">{openCount}</TableCell>
            <TableCell className="text-title px-4 py-2.5 text-right tabular-nums sm:px-3">
              {formatCurrency(openValue, currencyFormat)}
            </TableCell>
            <TableCell className="hidden px-4 sm:table-cell" />
          </TableRow>
        </TableBody>
      </Table>
    </ReportPanel>
  );
}
