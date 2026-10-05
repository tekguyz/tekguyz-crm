import { IconAlertTriangle } from "@tabler/icons-react";
import { AgendaPanel } from "@/components/agenda/AgendaPanel";
import { LeadCard } from "@/components/agenda/LeadCard";
import type { Lead } from "@/lib/leads/queries";

export function SlaCriticalQueue({
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
      title="SLA Critical"
      icon={<IconAlertTriangle aria-hidden="true" size={18} stroke={1.75} className="text-danger" />}
      emptyText="Nothing overdue."
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
