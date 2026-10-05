import { SlaCriticalQueue } from "@/components/agenda/SlaCriticalQueue";
import { HighValueTrack } from "@/components/agenda/HighValueTrack";
import { StarredWorkspace } from "@/components/agenda/StarredWorkspace";
import { TasksDueQueue } from "@/components/agenda/TasksDueQueue";
import { NeedsReviewQueue } from "@/components/agenda/NeedsReviewQueue";
import type { Lead } from "@/lib/leads/queries";
import type { TaskDue } from "@/lib/tasks/queries";
import type { FlaggedLead } from "@/lib/leads/spam-review";

export function TodayAgenda({
  slaCriticalLeads,
  highValueLeads,
  starredLeads,
  tasksDue,
  flaggedLeads,
  orgTimezone,
  currencyFormat,
}: {
  slaCriticalLeads: Lead[];
  highValueLeads: Lead[];
  starredLeads: Lead[];
  tasksDue: TaskDue[];
  flaggedLeads: FlaggedLead[];
  orgTimezone: string;
  currencyFormat: string;
}) {
  return (
    // Four capped panels in a 2x2 grid, so every queue is on the first screen.
    // Tasks Due leads (top left): it is explicit, user-committed work, and SLA
    // Critical sits beside it as the other "late" list.
    <div className="flex flex-col gap-4">
      {/* Above the grid: a lead the shield may have wrongly flagged is the
          most perishable item on this page. Self-hiding when empty. */}
      <NeedsReviewQueue leads={flaggedLeads} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TasksDueQueue tasks={tasksDue} orgTimezone={orgTimezone} />
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
