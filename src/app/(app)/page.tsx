import { getCurrentOrg } from "@/lib/organizations/current";
import {
  getSlaCriticalLeads,
  getHighValueLeads,
  getStarredLeads,
} from "@/lib/leads/queries";
import { TodayAgenda } from "@/components/agenda/TodayAgenda";

export default async function TodayPage() {
  const { orgId, orgTimezone, currencyFormat } = await getCurrentOrg();

  const [slaCriticalLeads, highValueLeads, starredLeads] = await Promise.all([
    getSlaCriticalLeads(orgId),
    getHighValueLeads(orgId),
    getStarredLeads(orgId),
  ]);

  return (
    <TodayAgenda
      slaCriticalLeads={slaCriticalLeads}
      highValueLeads={highValueLeads}
      starredLeads={starredLeads}
      orgTimezone={orgTimezone}
      currencyFormat={currencyFormat}
    />
  );
}
