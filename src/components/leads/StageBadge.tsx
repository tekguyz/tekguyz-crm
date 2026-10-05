import { Badge } from "@/components/ui/Badge";
import { STATUS_TONE } from "@/lib/leads/status-tone";
import { PIPELINE_STATUS_LABELS, type PipelineStatus } from "@/lib/leads/pipeline";

// A stage looks the same everywhere: its STATUS_TONE hue, a dot, and the
// sentence-case label the Pipeline columns use. Never greyed out — an overdue
// lead says so through DueLabel, not by draining its stage colour.
export function StageBadge({ status, className }: { status: string; className?: string }) {
  const label =
    PIPELINE_STATUS_LABELS[status as PipelineStatus] ??
    status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} dot className={className}>
      {label}
    </Badge>
  );
}
