import { IconAlertCircle, IconClock } from "@tabler/icons-react";

import { describeDue } from "@/lib/format";
import { cn } from "@/lib/utils/cn";

// A next-action or task due date in words ("3d overdue", "Today · 3:30 PM").
// Overdue is the one place this uses --danger as text: it is the Going Cold
// signal, and it has to be readable at a glance, not a paler grey.
export function DueLabel({
  at,
  timeZone,
  className,
}: {
  at: string;
  timeZone: string;
  className?: string;
}) {
  const { label, overdue } = describeDue(at, timeZone);
  const Icon = overdue ? IconAlertCircle : IconClock;

  return (
    <span
      className={cn(
        "text-body-sm inline-flex shrink-0 items-center gap-1 whitespace-nowrap tabular-nums",
        overdue ? "font-medium text-danger" : "text-ink-muted",
        className,
      )}
    >
      <Icon aria-hidden="true" size={14} stroke={1.75} className="shrink-0" />
      {label}
    </span>
  );
}
