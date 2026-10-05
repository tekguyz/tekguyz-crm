import { IconStar } from "@tabler/icons-react";
import { AgendaPanel } from "@/components/agenda/AgendaPanel";
import { LeadCard } from "@/components/agenda/LeadCard";
import type { Lead } from "@/lib/leads/queries";

export function StarredWorkspace({
  leads,
  orgTimezone,
  currencyFormat,
}: {
  leads: Lead[];
  orgTimezone: string;
  currencyFormat: string;
}) {
  return (
    <AgendaPanel
      title="Starred"
      icon={<IconStar aria-hidden="true" size={18} stroke={1.75} className="fill-pill-orange-fg text-pill-orange-fg" />}
      emptyText="No starred accounts."
      items={leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          orgTimezone={orgTimezone}
          currencyFormat={currencyFormat}
        />
      ))}
    />
  );
}
