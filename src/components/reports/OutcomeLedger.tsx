import { formatCurrency } from "@/lib/format";
import type { OutcomeRow } from "@/lib/leads/report-queries";
import { Card } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/TableRow";

const OUTCOME_LABEL: Record<string, string> = {
  WON: "Won",
  LOST: "Lost",
  ABANDONED: "Abandoned",
};

// Won / Lost / Abandoned deliberately get NO green/red treatment. This design
// system spends colour on state you must act on (the Going Cold rule) and on
// the stage language; a closed lead needs neither. The counts and the money
// carry the story on their own.
export function OutcomeLedger({
  outcomes,
  currencyFormat,
}: {
  outcomes: OutcomeRow[];
  currencyFormat: string;
}) {
  return (
    <Card className="p-0">
      <div className="border-b border-hairline px-4 py-3">
        <h2 className="text-h2">Closed leads</h2>
        <p className="text-body-sm text-ink-muted">
          Every lead with an outcome, archived or not. Revenue is the amount actually
          recorded on the lead, so only won leads carry one.
        </p>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="px-4">Outcome</TableHeaderCell>
            <TableHeaderCell className="text-right">Leads</TableHeaderCell>
            <TableHeaderCell className="px-4 text-right">Revenue</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {outcomes.map((row, index) => (
            <TableRow
              key={row.outcome}
              className={index === outcomes.length - 1 ? "border-b-0" : undefined}
            >
              <TableCell className="px-4">{OUTCOME_LABEL[row.outcome] ?? row.outcome}</TableCell>
              <TableCell className="text-right tabular-nums">{row.count}</TableCell>
              <TableCell className="px-4 text-right tabular-nums">
                {row.revenue > 0 ? formatCurrency(row.revenue, currencyFormat) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
