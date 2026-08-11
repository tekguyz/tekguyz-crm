import { getCurrentOrg } from "@/lib/organizations/current";
import {
  getSlaCriticalLeads,
  getHighValueLeads,
  getStarredLeads,
} from "@/lib/leads/queries";
import { getTasksDueForOrg } from "@/lib/tasks/queries";
import { getLeadsUnderSpamReview } from "@/lib/leads/spam-review";
import { TodayAgenda } from "@/components/agenda/TodayAgenda";

export default async function TodayPage() {
  const { orgId, orgTimezone, currencyFormat } = await getCurrentOrg();

  const [slaCriticalLeads, highValueLeads, starredLeads, tasksDue, flaggedLeads] =
    await Promise.all([
      getSlaCriticalLeads(orgId),
      getHighValueLeads(orgId),
      getStarredLeads(orgId),
      getTasksDueForOrg(orgId),
      getLeadsUnderSpamReview(orgId),
    ]);

  return (
    <TodayAgenda
      slaCriticalLeads={slaCriticalLeads}
      highValueLeads={highValueLeads}
      starredLeads={starredLeads}
      tasksDue={tasksDue}
      flaggedLeads={flaggedLeads}
      orgTimezone={orgTimezone}
      currencyFormat={currencyFormat}
    />
  );
}
