import { describe, expect, it } from "vitest";

import type { PipelineReport } from "@/lib/leads/report-queries";
import {
  REPORT_EXPORT_HEADER,
  pipelineReportToCsv,
  reportCsvFilename,
} from "@/lib/reports/export-csv";

function report(overrides: Partial<PipelineReport> = {}): PipelineReport {
  return {
    stages: [
      { status: "NEW", label: "New", count: 2, value: 3000, share: 0.6 },
      { status: "CONTACTED", label: "Contacted", count: 1, value: 2000, share: 0.4 },
    ],
    openCount: 3,
    openValue: 5000,
    outcomes: [
      { outcome: "WON", count: 2, revenue: 7000 },
      { outcome: "LOST", count: 1, revenue: 0 },
      { outcome: "ABANDONED", count: 4, revenue: 0 },
    ],
    realizedRevenue: 7000,
    wonCount: 2,
    lostCount: 1,
    abandonedCount: 4,
    winRate: 2 / 3,
    ...overrides,
  };
}

const lines = (csv: string) => csv.trimEnd().split("\r\n");

describe("pipelineReportToCsv", () => {
  it("writes one header, then pipeline, outcome and win-rate rows in page order", () => {
    const rows = lines(pipelineReportToCsv(report()));
    expect(rows[0]).toBe(REPORT_EXPORT_HEADER.join(","));
    expect(rows.slice(1).map((r) => r.split(",")[0])).toEqual([
      "pipeline",
      "pipeline",
      "pipeline",
      "outcome",
      "outcome",
      "outcome",
      "win_rate",
    ]);
  });

  it("carries the report's own totals as plain numbers", () => {
    const rows = lines(pipelineReportToCsv(report()));
    expect(rows).toContain("pipeline,New,2,3000,60%");
    expect(rows).toContain("pipeline,Total open,3,5000,");
    expect(rows).toContain("outcome,WON,2,7000,");
    expect(rows).toContain("outcome,ABANDONED,4,0,");
  });

  it("uses the report's win rate, with won + lost as the denominator and abandoned excluded", () => {
    const winRow = lines(pipelineReportToCsv(report())).at(-1)!;
    expect(winRow).toBe('win_rate,"Won / (won + lost), abandoned excluded",3,,67%');
  });

  it("leaves the rate empty, not 0%, when nothing has been decided", () => {
    const winRow = lines(
      pipelineReportToCsv(report({ wonCount: 0, lostCount: 0, winRate: null })),
    ).at(-1)!;
    expect(winRow.endsWith(",0,,")).toBe(true);
  });

  it("neutralises a formula-shaped stage label through the shared helper", () => {
    const csv = pipelineReportToCsv(
      report({ stages: [{ status: "X", label: "=cmd()", count: 0, value: 0, share: 0 }] }),
    );
    expect(csv).toContain("pipeline,'=cmd(),0,0,0%");
  });
});

describe("reportCsvFilename", () => {
  it("names the period so two exports of different periods never collide", () => {
    expect(reportCsvFilename("TEKGUYZ Demo", "last-month", new Date("2026-09-14T09:00:00Z"))).toBe(
      "tekguyz-demo-report-last-month-2026-09-14.csv",
    );
  });
});
