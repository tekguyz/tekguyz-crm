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
    // Tasks Due sits full-width above the lead grid rather than becoming a
    // fourth column: it's org-wide and cross-cutting (explicit user-committed
    // work), not another per-lead pipeline slice, and a 4th column would
    // squeeze all four. The existing 3-column grid below is untouched.
    <div className="flex flex-col gap-6">
      {/* Above Tasks Due: a lead the shield may have wrongly flagged is the
          most perishable item on this page. Self-hiding when empty. */}
      <NeedsReviewQueue leads={flaggedLeads} />

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
