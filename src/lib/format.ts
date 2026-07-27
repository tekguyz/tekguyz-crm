export function isOverdue(nextActionAt: string): boolean {
  // Instant comparison — timezone-invariant. next_action_at is a timestamptz
  // (an absolute point on the UTC timeline), so this is correct regardless of
  // the org's stored timezone. The org's timezone is only needed for display
  // formatting below, never for this breach determination — collapsing
  // either side down to a calendar date first (e.g. "different UTC day =
  // overdue") is the bug this deliberately avoids.
  return new Date(nextActionAt).getTime() < Date.now();
}

export function formatDueAt(nextActionAt: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(nextActionAt));
}

// A reasonable default display locale per currency code — not a real
// user-locale mapping (this app has no per-user locale setting), just enough
// to get sane grouping/symbol-placement conventions for org.currency_format
// values outside USD. Falls back to "en-US" for anything not listed.
const CURRENCY_LOCALES: Record<string, string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  CAD: "en-CA",
  AUD: "en-AU",
  NZD: "en-NZ",
  JPY: "ja-JP",
  CNY: "zh-CN",
  HKD: "zh-HK",
  SGD: "en-SG",
  INR: "en-IN",
  CHF: "de-CH",
  SEK: "sv-SE",
  NOK: "nb-NO",
  DKK: "da-DK",
  PLN: "pl-PL",
  MXN: "es-MX",
  BRL: "pt-BR",
  ZAR: "en-ZA",
  AED: "ar-AE",
  ILS: "he-IL",
  KRW: "ko-KR",
  THB: "th-TH",
  IDR: "id-ID",
  PHP: "en-PH",
};

export function formatCurrency(amount: number, currency: string): string {
  const locale = CURRENCY_LOCALES[currency] ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
