import { getCurrentOrg } from "@/lib/organizations/current";
import { getAllContacts } from "@/lib/leads/queries";
import { ContactsGrid } from "@/components/contacts/ContactsGrid";
import { FilterTabs } from "@/components/leads/FilterTabs";

// Preserves whichever filters are NOT being changed, so Archived + My Leads
// combine instead of resetting each other. Both are omitted when off rather
// than written as "false", to keep the default view's URL clean.
function contactsHref({ archived, mine }: { archived: boolean; mine: boolean }): string {
  const params = new URLSearchParams();
  if (archived) params.set("archived", "true");
  if (mine) params.set("mine", "true");
  const query = params.toString();
  return query ? `/contacts?${query}` : "/contacts";
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string; mine?: string }>;
}) {
  const { archived, mine } = await searchParams;
  const showArchived = archived === "true";
  const showMine = mine === "true";

  const { orgId, userId } = await getCurrentOrg();
  // Filtering happens in the query, not in the grid — assigned_to is indexed
  // (idx_leads_tenant_assignee) and this keeps the "empty" state honest: the
  // count the user sees is the count the database returned.
  const contacts = await getAllContacts(orgId, showArchived, showMine ? userId : undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FilterTabs
          tabs={[
            {
              label: "Active",
              href: contactsHref({ archived: false, mine: showMine }),
              active: !showArchived,
            },
            {
              label: "Archived",
              href: contactsHref({ archived: true, mine: showMine }),
              active: showArchived,
            },
          ]}
        />
        {/* A second, independent group: ownership is a different question from
            whether a contact is still live, so the two stack rather than being
            four mutually exclusive tabs. */}
        <FilterTabs
          tabs={[
            {
              label: "All leads",
              href: contactsHref({ archived: showArchived, mine: false }),
              active: !showMine,
            },
            {
              label: "My leads",
              href: contactsHref({ archived: showArchived, mine: true }),
              active: showMine,
            },
          ]}
        />
      </div>

      <ContactsGrid
        contacts={contacts}
        emptyMessage={
          showMine
            ? "No contacts are assigned to you."
            : showArchived
              ? "No archived leads."
              : "No contacts yet."
        }
      />
    </div>
  );
}
