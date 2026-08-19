import { formatCurrency } from "@/lib/format";
import type { StageRow } from "@/lib/leads/report-queries";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/TableRow";

// The same stage->pill mapping the lead cards use (STATUS_TONE in
// components/agenda/LeadCard.tsx). A stage has to look the same everywhere it
// appears or the colour stops being a stage language and becomes decoration,
// which the design system does not allow. If one map changes, change both.
const STAGE_TONE: Record<string, BadgeTone> = {
  NEW: "sky",
  DISCOVERY: "purple",
  QUOTED: "orange",
  ACTIVE: "green",
};

// The bar in the SHARE column, in the stage's own pill foreground. It is the
// one place this view spends colour, and it earns it: the percentage is
// already printed beside it, so the bar exists to make the shape of the
// pipeline readable in one glance rather than four comparisons. Kept to 4px so
// it reads as structure next to the hairline rules, not as a chart.
const BAR_COLOR: Record<string, string> = {
  NEW: "bg-pill-sky-fg",
  DISCOVERY: "bg-pill-purple-fg",
  QUOTED: "bg-pill-orange-fg",
  ACTIVE: "bg-pill-green-fg",
};

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
    <Card className="p-0">
      <div className="border-b border-hairline px-4 py-3">
        <h2 className="text-h2">Pipeline by stage</h2>
        <p className="text-body-sm text-ink-muted">
          Estimated revenue of every lead still open. Archived leads are not counted.
        </p>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="px-4">Stage</TableHeaderCell>
            <TableHeaderCell className="text-right">Leads</TableHeaderCell>
            <TableHeaderCell className="text-right">Value</TableHeaderCell>
            <TableHeaderCell className="w-[38%] px-4">Share</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stages.map((stage) => (
            <TableRow key={stage.status}>
              <TableCell className="px-4">
                <Badge tone={STAGE_TONE[stage.status] ?? "neutral"} className="rounded-full px-2">
                  {stage.label}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{stage.count}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(stage.value, currencyFormat)}
              </TableCell>
              <TableCell className="px-4">
                <div className="flex items-center gap-3">
                  {/* aria-hidden: the percentage next to it is the accessible
                      value, so a screen reader hears the number once. */}
                  <div
                    aria-hidden="true"
                    className="h-1 min-w-0 flex-1 rounded-full bg-canvas-soft"
                  >
                    <div
                      className={`h-1 rounded-full ${BAR_COLOR[stage.status] ?? "bg-ink-muted"}`}
                      style={{ width: `${Math.round(stage.share * 100)}%` }}
                    />
                  </div>
                  <span className="text-body-sm w-10 shrink-0 text-right tabular-nums text-ink-muted">
                    {Math.round(stage.share * 100)}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-b-0">
            <TableCell className="text-title px-4">Open pipeline</TableCell>
            <TableCell className="text-title text-right tabular-nums">{openCount}</TableCell>
            <TableCell className="text-title text-right tabular-nums">
              {formatCurrency(openValue, currencyFormat)}
            </TableCell>
            <TableCell className="px-4" />
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}
