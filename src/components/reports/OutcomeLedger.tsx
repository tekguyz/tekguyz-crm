import type { ReactNode } from "react";
import { IconCircleCheck, IconCircleMinus, IconCircleX, IconFlag } from "@tabler/icons-react";

import { formatCurrency } from "@/lib/format";
import type { OutcomeKey, OutcomeRow } from "@/lib/leads/report-queries";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { ReportPanel } from "@/components/reports/ReportPanel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/TableRow";

const ICON_PROPS = { "aria-hidden": true, size: 14, stroke: 1.75 } as const;

// Won is green, Lost is red, Abandoned stays neutral. An outcome is a signal
// like a stage is, so it gets its hue (revised 2026-10-12; the old rule gave
// closed leads no colour at all). Each pill also carries an icon and its word,
// so the difference is never colour alone, and the icon shapes keep these
// apart from the stage pills, which wear a dot. Abandoned is neutral on
// purpose: nobody decided it, so it is neither a win nor a loss.
const OUTCOME: Record<OutcomeKey, { label: string; tone: BadgeTone; icon: ReactNode }> = {
  WON: { label: "Won", tone: "green", icon: <IconCircleCheck {...ICON_PROPS} /> },
  LOST: { label: "Lost", tone: "red", icon: <IconCircleX {...ICON_PROPS} /> },
  ABANDONED: { label: "Abandoned", tone: "neutral", icon: <IconCircleMinus {...ICON_PROPS} /> },
};

export function OutcomeLedger({
  outcomes,
  currencyFormat,
}: {
  outcomes: OutcomeRow[];
  currencyFormat: string;
}) {
  const closedCount = outcomes.reduce((sum, row) => sum + row.count, 0);

  return (
    <ReportPanel
      id="outcome-ledger"
      icon={
        <IconFlag aria-hidden="true" size={18} stroke={1.75} className="text-ink-muted" />
      }
      title="Closed leads"
      count={closedCount}
      countLabel="closed leads"
      description="Every lead with an outcome, archived or not. Revenue is the amount actually recorded on the lead, so only won leads carry one."
    >
      <Table aria-labelledby="outcome-ledger-title">
        <TableHead>
          <TableRow>
            <TableHeaderCell scope="col" className="px-4">
              Outcome
            </TableHeaderCell>
            <TableHeaderCell scope="col" className="text-right">
              Leads
            </TableHeaderCell>
            <TableHeaderCell scope="col" className="px-4 text-right">
              Revenue
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {outcomes.map((row, index) => {
            const outcome = OUTCOME[row.outcome];
            return (
              <TableRow
                key={row.outcome}
                className={index === outcomes.length - 1 ? "border-b-0" : undefined}
              >
                <TableHeaderCell
                  scope="row"
                  className="px-4 py-2.5 align-middle font-normal text-ink-main"
                >
                  <Badge tone={outcome.tone}>
                    {outcome.icon}
                    {outcome.label}
                  </Badge>
                </TableHeaderCell>
                <TableCell className="py-2.5 text-right align-middle tabular-nums">
                  {row.count}
                </TableCell>
                <TableCell
                  className={`px-4 py-2.5 text-right align-middle tabular-nums ${
                    row.revenue > 0 ? "text-title text-pill-green-fg" : "text-ink-muted"
                  }`}
                >
                  {row.revenue > 0 ? formatCurrency(row.revenue, currencyFormat) : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ReportPanel>
  );
}
