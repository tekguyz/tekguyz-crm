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
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-title">Starred</h2>
      {leads.length === 0 ? (
        <p className="text-body-md text-ink-muted">No starred accounts.</p>
      ) : (
        leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            orgTimezone={orgTimezone}
            currencyFormat={currencyFormat}
          />
        ))
      )}
    </section>
  );
}
