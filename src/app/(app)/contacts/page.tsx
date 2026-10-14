import type { Metadata } from "next";

import { getCurrentOrg } from "@/lib/organizations/current";
import { getAllContacts } from "@/lib/leads/queries";
import { sortLeads } from "@/lib/leads/sort";
import { parseView, stagesKey, type RawSearchParams } from "@/lib/views/params";
import { ContactsList } from "@/components/contacts/ContactsList";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { ViewBar } from "@/components/views/ViewBar";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  // The URL is the only view state (lib/views/params.ts). The @header slot
  // parses the same params and makes the same query, so its count is this
  // list's own.
  const view = parseView("contacts", await searchParams);

  const { orgId, userId, orgTimezone, currencyFormat } = await getCurrentOrg();
  // Filtering happens in the query, not in the list — assigned_to is indexed
  // (idx_leads_tenant_assignee) and this keeps the "empty" state honest: the
  // count the user sees is the count the database returned. Sorting happens
  // here, on a copy: the query result is cache()d and shared with the header.
  const contacts = sortLeads(
    await getAllContacts(orgId, view.archived, view.mine ? userId : undefined, stagesKey(view.stages)),
    view.sort,
    view.dir,
  );

  const emptyMessage =
    view.stages.length > 0
      ? "No contacts in these stages."
      : view.mine
        ? "No contacts are assigned to you."
        : view.archived
          ? "No archived leads."
          : "No contacts yet.";

  return (
    <div className="space-y-4">
      <ViewBar page="contacts" view={view} />

      {/* The table at lg and up; the two-line row list with 44px call, text
          and email targets below it. Both get the same sorted rows. */}
      <div className="hidden lg:block">
        <LeadsTable
          page="contacts"
          leads={contacts}
          view={view}
          orgTimezone={orgTimezone}
          currencyFormat={currencyFormat}
          emptyMessage={emptyMessage}
        />
      </div>
      <div className="lg:hidden">
        <ContactsList contacts={contacts} emptyMessage={emptyMessage} />
      </div>
    </div>
  );
}
