import { escapeCsvValue } from "@/lib/leads/export-csv";
import type { PipelineReport } from "@/lib/leads/report-queries";
import { formatPercent } from "@/lib/reports/percent";
import type { ReportPeriod } from "@/lib/reports/periods";

// CSV of the /reports AGGREGATE, not of rows. Separate from the row-level
// leads export (lib/leads/export-csv.ts) because this serialises a computed
// shape with no table behind it; the only thing shared is the quoting and
// formula-neutralising helper, which must never exist twice.
//
// One table, one header, three sections in the order the page renders them:
// pipeline value by status, closed leads by outcome, then the win rate. A
// single uniform header keeps the file sortable and filterable in a
// spreadsheet, where three differently-shaped tables stacked in one sheet
// would not be.
//
// Every figure comes from getPipelineReport — the same call the page makes —
// so nothing here recomputes a total or restates the win-rate formula. Money
// is written as a plain number, not formatCurrency's string, so a spreadsheet
// can sum it.
export const REPORT_EXPORT_HEADER = ["section", "item", "count", "amount", "rate"] as const;

type Cell = string | number | null;

export function pipelineReportToCsv(report: PipelineReport): string {
  const rows: Cell[][] = [];

  for (const stage of report.stages) {
    rows.push(["pipeline", stage.label, stage.count, stage.value, formatPercent(stage.share)]);
  }
  rows.push(["pipeline", "Total open", report.openCount, report.openValue, null]);

  for (const outcome of report.outcomes) {
    rows.push(["outcome", outcome.outcome, outcome.count, outcome.revenue, null]);
  }

  // count is the denominator — won plus lost, abandoned excluded — exactly the
  // "N won of M decided" the page prints. A null win rate stays empty, not 0%.
  rows.push([
    "win_rate",
    "Won / (won + lost), abandoned excluded",
    report.wonCount + report.lostCount,
    null,
    report.winRate === null ? null : formatPercent(report.winRate),
  ]);

  const lines = [REPORT_EXPORT_HEADER.join(","), ...rows.map((r) => r.map(escapeCsvValue).join(","))];
  // CRLF, matching the row-level export — Excel on Windows is the consumer.
  return `${lines.join("\r\n")}\r\n`;
}

export function reportCsvFilename(
  orgName: string,
  period: ReportPeriod,
  now: Date = new Date(),
): string {
  const slug =
    orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "organization";
  return `${slug}-report-${period}-${now.toISOString().slice(0, 10)}.csv`;
}
