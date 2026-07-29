import { getCurrentOrg } from "@/lib/organizations/current";
import {
  getSlaCriticalLeads,
  getHighValueLeads,
  getStarredLeads,
} from "@/lib/leads/queries";
import { getTasksDueForOrg } from "@/lib/tasks/queries";
import { TodayAgenda } from "@/components/agenda/TodayAgenda";

export default async function TodayPage() {
  const { orgId, orgTimezone, currencyFormat } = await getCurrentOrg();

  const [slaCriticalLeads, highValueLeads, starredLeads, tasksDue] = await Promise.all([
    getSlaCriticalLeads(orgId),
    getHighValueLeads(orgId),
    getStarredLeads(orgId),
    getTasksDueForOrg(orgId),
  ]);

  return (
    <TodayAgenda
      slaCriticalLeads={slaCriticalLeads}
      highValueLeads={highValueLeads}
      starredLeads={starredLeads}
      tasksDue={tasksDue}
      orgTimezone={orgTimezone}
      currencyFormat={currencyFormat}
    />
  );
}
