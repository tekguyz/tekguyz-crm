// Calendar periods for the /reports view, resolved in the ORGANIZATION's own
// timezone (organizations.timezone, surfaced as orgTimezone by getCurrentOrg).
// Never UTC and never the browser's: the aggregation runs on the server, where
// there is no browser zone to read, and "this month" has to mean the same
// month for every member of a tenant no matter where they are sitting.
//
// Three decisions are baked in here, all deliberate:
//   1. A period is a CALENDAR boundary in the org's zone. No proration, ever —
//      a half-elapsed month reports the leads it actually has, not a scaled
//      projection of them.
//   2. The start is inclusive and the end exclusive ([start, end)), which is
//      what keeps a lead landing exactly on a boundary in one period and not
//      in two.
//   3. Which timestamp buckets a lead is the CALLER's choice, not this
//      module's — closed leads bucket by closed_at, open pipeline by
//      created_at, because an open lead has no closed_at yet. See
//      getPipelineReport in lib/leads/report-queries.ts.
//
// Pure functions only: no database, no request, no clock of its own (`now` is
// always passed in), so every rule above is unit-testable.

export const REPORT_PERIODS = ["all", "this-month", "last-month", "this-year"] as const;

export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  all: "All time",
  "this-month": "This month",
  "last-month": "Last month",
  "this-year": "This year",
};

// null means all-time — no filter at all, which is not the same as an
// unbounded range and is why this is not a pair of sentinel dates.
export type PeriodRange = { startISO: string; endISO: string } | null;

export function parseReportPeriod(value: string | undefined): ReportPeriod {
  return (REPORT_PERIODS as readonly string[]).includes(value ?? "")
    ? (value as ReportPeriod)
    : "all";
}

// Formats an instant in `timezone` and reads the wall-clock fields back. h23
// rather than hour12:false — the latter can emit hour "24" for midnight under
// some ICU versions, which would silently shift a boundary by a day.
const PARTS_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = PARTS_FORMATTER_CACHE.get(timezone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  PARTS_FORMATTER_CACHE.set(timezone, formatter);
  return formatter;
}

type WallClock = { year: number; month: number; day: number };

function wallClockAt(timestamp: number, timezone: string): WallClock & {
  hour: number;
  minute: number;
  second: number;
} {
  const parts = partsFormatter(timezone).formatToParts(new Date(timestamp));
  const read = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

// The zone's UTC offset at a given instant, in milliseconds.
function offsetMsAt(timestamp: number, timezone: string): number {
  const w = wallClockAt(timestamp, timezone);
  const asIfUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asIfUtc - timestamp;
}

// The UTC instant of local midnight on a given calendar date in `timezone`.
// Two passes, and the second one is not optional: the offset is itself a
// function of the instant, so the first guess uses the offset in force at UTC
// midnight, which is the wrong side of a DST change roughly twice a year.
// Re-reading the offset at the corrected instant settles it.
function utcInstantOfLocalMidnight(
  year: number,
  month: number,
  day: number,
  timezone: string,
): number {
  const naive = Date.UTC(year, month - 1, day);
  const firstPass = naive - offsetMsAt(naive, timezone);
  return naive - offsetMsAt(firstPass, timezone);
}

function range(
  start: WallClock,
  end: WallClock,
  timezone: string,
): { startISO: string; endISO: string } {
  return {
    startISO: new Date(
      utcInstantOfLocalMidnight(start.year, start.month, start.day, timezone),
    ).toISOString(),
    endISO: new Date(
      utcInstantOfLocalMidnight(end.year, end.month, end.day, timezone),
    ).toISOString(),
  };
}

export function resolvePeriodRange(
  period: ReportPeriod,
  timezone: string,
  now: Date = new Date(),
): PeriodRange {
  if (period === "all") return null;

  const today = wallClockAt(now.getTime(), timezone);

  if (period === "this-year") {
    return range(
      { year: today.year, month: 1, day: 1 },
      { year: today.year + 1, month: 1, day: 1 },
      timezone,
    );
  }

  // Month arithmetic done on a 1-based month, rolled by hand rather than via
  // Date, so a December/January crossing cannot pick up the host's own zone.
  const anchorMonth = period === "last-month" ? today.month - 1 : today.month;
  const startYear = anchorMonth < 1 ? today.year - 1 : today.year;
  const startMonth = anchorMonth < 1 ? 12 : anchorMonth;
  const endYear = startMonth === 12 ? startYear + 1 : startYear;
  const endMonth = startMonth === 12 ? 1 : startMonth + 1;

  return range(
    { year: startYear, month: startMonth, day: 1 },
    { year: endYear, month: endMonth, day: 1 },
    timezone,
  );
}

// The bucketing rule itself, kept separate from the query so it can be tested
// without a database. The database applies the same [start, end) comparison
// via .gte()/.lt(); this exists so the boundary behaviour is pinned by a test
// rather than by trust in PostgREST's operators.
export function isWithinRange(timestamp: string | null, periodRange: PeriodRange): boolean {
  if (periodRange === null) return true;
  if (!timestamp) return false;
  const at = new Date(timestamp).getTime();
  if (Number.isNaN(at)) return false;
  return (
    at >= new Date(periodRange.startISO).getTime() &&
    at < new Date(periodRange.endISO).getTime()
  );
}
