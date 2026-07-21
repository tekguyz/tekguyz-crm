import type { Lead } from "@/lib/leads/queries";
import { isOverdue } from "@/lib/format";

export const PIPELINE_STATUSES = ["NEW", "DISCOVERY", "QUOTED", "ACTIVE"] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export const PIPELINE_STATUS_LABELS: Record<PipelineStatus, string> = {
  NEW: "New",
  DISCOVERY: "Discovery",
  QUOTED: "Quoted",
  ACTIVE: "Active",
};

// Shared priority ordering — overdue first, then starred, then highest revenue,
// then soonest due. This is the "existing field logic" that drives in-column
// order for both the Kanban board (Prompt 4) and the Focus List (Prompt 5), so
// the two views never disagree about what matters most within a status. There
// is deliberately no persisted manual order: dragging within a column never
// writes anything, so a reload always re-derives this same order.
export function comparePipelinePriority(a: Lead, b: Lead): number {
  const overdueA = isOverdue(a.next_action_at);
  const overdueB = isOverdue(b.next_action_at);
  if (overdueA !== overdueB) return overdueA ? -1 : 1;

  if (a.is_starred !== b.is_starred) return a.is_starred ? -1 : 1;

  if (a.estimated_revenue !== b.estimated_revenue) {
    return b.estimated_revenue - a.estimated_revenue;
  }

  return new Date(a.next_action_at).getTime() - new Date(b.next_action_at).getTime();
}

export function groupLeadsByStatus(leads: Lead[]): Record<PipelineStatus, Lead[]> {
  const groups = Object.fromEntries(
    PIPELINE_STATUSES.map((status) => [status, [] as Lead[]]),
  ) as Record<PipelineStatus, Lead[]>;

  for (const lead of leads) {
    const bucket = groups[lead.status as PipelineStatus];
    (bucket ?? groups.NEW).push(lead);
  }

  for (const status of PIPELINE_STATUSES) {
    groups[status].sort(comparePipelinePriority);
  }

  return groups;
}
