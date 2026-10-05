import { IconCurrencyDollar } from "@tabler/icons-react";
import { AgendaPanel } from "@/components/agenda/AgendaPanel";
import { LeadCard } from "@/components/agenda/LeadCard";
import type { Lead } from "@/lib/leads/queries";

export function HighValueTrack({
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
      title="High-Value"
      icon={<IconCurrencyDollar aria-hidden="true" size={18} stroke={1.75} className="text-pill-green-fg" />}
      emptyText="No active leads yet."
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
