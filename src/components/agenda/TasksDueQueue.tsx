import Link from "next/link";
import { isOverdue, formatDueAt } from "@/lib/format";
import type { TaskDue } from "@/lib/tasks/queries";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// Named to match its real siblings (SlaCriticalQueue / HighValueTrack /
// StarredWorkspace), which use a <Concept><Container> shape with no "Section"
// suffix.
//
// Deliberately does NOT reuse the "Going Cold" SLA treatment (dashed --cold
// border + grayscale pill) that LeadCard uses. An overdue task and a lead
// breaching its next_action_at SLA are different concepts, and letting them
// share a visual language would imply a relationship that doesn't exist — so
// an overdue task gets a decorative orange status pill instead, per the design
// system's rule that the decorative palette is for status badges only.
export function TasksDueQueue({
  tasks,
  orgTimezone,
}: {
  tasks: TaskDue[];
  orgTimezone: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-title">Tasks Due</h2>
      {tasks.length === 0 ? (
        <p className="text-body-md text-ink-muted">No tasks due.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => {
            // isOverdue is a plain instant comparison (see lib/format.ts) —
            // correct for due_at as-is, despite its lead-oriented param name.
            const overdue = isOverdue(task.due_at);

            return (
              <li key={task.id}>
                {/* Reuses the app-wide ?leadId= deep link that
                    ProfileSheetController (mounted in AppShell) already
                    listens for — no second sheet-opening mechanism. */}
                <Link href={`/?leadId=${task.lead_id}`} className="block">
                  {/* Card is Level 0, so v1's elevation-1 → elevation-2 hover
                      is replaced by a canvas-soft wash, same as the lead
                      cards. `cold` is deliberately NOT passed — see the note
                      above on why an overdue task and an SLA-breaching lead
                      must not share a visual language. */}
                  <Card className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-canvas-soft">
                    <div className="min-w-0">
                      <p className="text-body-md truncate font-medium">{task.title}</p>
                      <p className="text-body-sm truncate text-ink-muted">
                        {task.client_name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {overdue && (
                        <Badge tone="orange" className="rounded-full px-2">
                          Overdue
                        </Badge>
                      )}
                      <span className="text-body-sm text-ink-muted">
                        {formatDueAt(task.due_at, orgTimezone)}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
