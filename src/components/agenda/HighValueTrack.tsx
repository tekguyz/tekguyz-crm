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
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-sm font-semibold">High-Value</h2>
      {leads.length === 0 ? (
        <p className="text-sm text-ink-muted">No active leads yet.</p>
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
