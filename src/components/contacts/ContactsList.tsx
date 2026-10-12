import { ContactRow } from "@/components/contacts/ContactRow";
import type { ContactLead } from "@/lib/leads/queries";

// The Contacts directory: one bordered panel, one dense row per contact, the
// same shape as Today's queues. It replaced a card grid that read A–Z in a
// four-wide zig-zag and showed no stage, owner or avatar.
//
// At lg and up the panel is a four-column grid (name, stage, channels, owner)
// and every row and the header are subgrids of it, so `auto` columns size to
// the widest cell in the whole list and stay aligned. The name column is
// capped so the stage sits next to the name on a wide screen; the owner
// column takes the leftover width. Below lg the header is hidden and each row
// wraps to two lines.
const COLUMNS = ["Name", "Stage", "Channels", "Owner"];

export function ContactsList({
  contacts,
  emptyMessage = "No contacts yet.",
}: {
  contacts: ContactLead[];
  emptyMessage?: string;
}) {
  if (contacts.length === 0) {
    return (
      <div className="text-body-md rounded-lg border border-dashed border-hairline px-3 py-8 text-center text-ink-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-canvas-pure lg:grid lg:grid-cols-[minmax(14rem,22rem)_auto_auto_minmax(9rem,1fr)]">
      <div
        aria-hidden="true"
        className="text-label hidden border-b border-hairline px-3 py-2 text-ink-muted lg:col-span-4 lg:grid lg:grid-cols-subgrid lg:gap-x-6"
      >
        {COLUMNS.map((column) => (
          <span key={column} className={column === "Name" ? "pl-9" : undefined}>
            {column}
          </span>
        ))}
      </div>

      <ul className="divide-y divide-hairline lg:col-span-4 lg:grid lg:grid-cols-subgrid">
        {contacts.map((lead) => (
          <ContactRow key={lead.id} lead={lead} />
        ))}
      </ul>
    </div>
  );
}
