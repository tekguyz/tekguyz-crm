import { getCurrentOrg } from "@/lib/organizations/current";
import { getAllContacts } from "@/lib/leads/queries";
import { ContactsGrid } from "@/components/contacts/ContactsGrid";
import { FilterTabs } from "@/components/leads/FilterTabs";
import { Button } from "@/components/ui/Button";
import { IconDownload } from "@tabler/icons-react";

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

        {/* A plain <a>, not a Link: this navigates to a file download, and
            next/link would try to client-navigate a route that returns CSV.
            Button's asChild supplies the classes so no copy of them exists
            here. `download` is a hint only — the route's own
            Content-Disposition is what actually names the file. The export is
            the whole directory, so it deliberately ignores the filters above:
            a backup that silently omitted the rows you had filtered out would
            be wrong in the one way an export must not be. */}
        <Button asChild size="sm" variant="secondary" className="ml-auto">
          <a href="/api/leads/export" download>
            <IconDownload size={16} stroke={1.5} aria-hidden="true" />
            Export CSV
          </a>
        </Button>
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
