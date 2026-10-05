import Link from "next/link";
import { IconChecklist } from "@tabler/icons-react";
import type { TaskDue } from "@/lib/tasks/queries";
import { AgendaPanel } from "@/components/agenda/AgendaPanel";
import { TaskDismissButton } from "@/components/agenda/TaskDismissButton";
import { DueLabel } from "@/components/leads/DueLabel";

// Named to match its real siblings (SlaCriticalQueue / HighValueTrack /
// StarredWorkspace), which use a <Concept><Container> shape with no "Section"
// suffix.
//
// One line per task: what to do, for whom, and when. Each used to be a
// full-width two-line card, so five tasks filled the screen. An overdue task
// says so in red through DueLabel, the same words a late lead uses.
export function TasksDueQueue({
  tasks,
  orgTimezone,
}: {
  tasks: TaskDue[];
  orgTimezone: string;
}) {
  return (
    <AgendaPanel
      title="Tasks Due"
      icon={<IconChecklist aria-hidden="true" size={18} stroke={1.75} className="text-pill-sky-fg" />}
      emptyText="No tasks due."
      items={tasks.map((task) => (
        // The dismiss control sits OUTSIDE the <Link>, so the row is a flex
        // pair rather than a bare anchor: a <button> inside an <a> is invalid
        // HTML.
        <li key={task.id} className="flex items-center pr-1">
          {/* Reuses the app-wide ?leadId= deep link that
              ProfileSheetController (mounted in AppShell) already listens
              for — no second sheet-opening mechanism. */}
          <Link
            href={`/?leadId=${task.lead_id}`}
            className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-canvas-soft"
          >
            {/* One line from sm up; on a phone the client drops to a second
                line instead of being truncated away. */}
            <span className="text-body-md flex min-w-0 flex-1 flex-col sm:flex-row sm:gap-1">
              <span className="truncate font-medium sm:shrink-0 sm:max-w-[70%]">{task.title}</span>
              <span className="text-body-sm sm:text-body-md truncate text-ink-muted">
                <span aria-hidden="true" className="hidden sm:inline">· </span>
                {task.client_name}
              </span>
            </span>
            <DueLabel at={task.due_at} timeZone={orgTimezone} />
          </Link>
          <TaskDismissButton taskId={task.id} title={task.title} />
        </li>
      ))}
    />
  );
}
