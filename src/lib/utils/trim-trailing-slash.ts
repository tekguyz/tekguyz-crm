// Shared by every env-var-constructed URL in the app (notify-new-lead.ts,
// send-weekly-report.ts) — extracted after the same one-liner shipped
// slightly differently (and once, not at all) across multiple files. Use
// this instead of re-implementing the regex at a new call site.
export function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
