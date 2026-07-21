import { ContactCard } from "@/components/contacts/ContactCard";
import type { ContactLead } from "@/lib/leads/queries";

export function ContactsGrid({ contacts }: { contacts: ContactLead[] }) {
  if (contacts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-hairline text-sm text-ink-muted">
        No contacts yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {contacts.map((lead) => (
        <ContactCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
