import { SlaCriticalQueue } from "@/components/agenda/SlaCriticalQueue";
import { HighValueTrack } from "@/components/agenda/HighValueTrack";
import { StarredWorkspace } from "@/components/agenda/StarredWorkspace";
import { TasksDueQueue } from "@/components/agenda/TasksDueQueue";
import type { Lead } from "@/lib/leads/queries";
import type { TaskDue } from "@/lib/tasks/queries";

export function TodayAgenda({
  slaCriticalLeads,
  highValueLeads,
  starredLeads,
  tasksDue,
  orgTimezone,
  currencyFormat,
}: {
  slaCriticalLeads: Lead[];
  highValueLeads: Lead[];
  starredLeads: Lead[];
  tasksDue: TaskDue[];
  orgTimezone: string;
  currencyFormat: string;
}) {
  return (
    // Tasks Due sits full-width above the lead grid rather than becoming a
    // fourth column: it's org-wide and cross-cutting (explicit user-committed
    // work), not another per-lead pipeline slice, and a 4th column would
    // squeeze all four. The existing 3-column grid below is untouched.
    <div className="flex flex-col gap-6">
      <TasksDueQueue tasks={tasksDue} orgTimezone={orgTimezone} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SlaCriticalQueue
          leads={slaCriticalLeads}
          orgTimezone={orgTimezone}
          currencyFormat={currencyFormat}
        />
        <HighValueTrack
          leads={highValueLeads}
          orgTimezone={orgTimezone}
          currencyFormat={currencyFormat}
        />
        <StarredWorkspace
          leads={starredLeads}
          orgTimezone={orgTimezone}
          currencyFormat={currencyFormat}
        />
      </div>
    </div>
  );
}
