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

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
