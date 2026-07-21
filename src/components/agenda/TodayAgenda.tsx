import { SlaCriticalQueue } from "@/components/agenda/SlaCriticalQueue";
import { HighValueTrack } from "@/components/agenda/HighValueTrack";
import { StarredWorkspace } from "@/components/agenda/StarredWorkspace";
import type { Lead } from "@/lib/leads/queries";

export function TodayAgenda({
  slaCriticalLeads,
  highValueLeads,
  starredLeads,
  orgTimezone,
  currencyFormat,
}: {
  slaCriticalLeads: Lead[];
  highValueLeads: Lead[];
  starredLeads: Lead[];
  orgTimezone: string;
  currencyFormat: string;
}) {
  return (
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
  );
}
