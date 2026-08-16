import Link from "next/link";
import { getCurrentOrg } from "@/lib/organizations/current";
import { getAllContacts } from "@/lib/leads/queries";
import { ContactsGrid } from "@/components/contacts/ContactsGrid";

const tabClass = (active: boolean) =>
  `rounded-md border border-hairline px-3 py-1 text-sm transition-colors ${
    active
      ? "bg-canvas-pure font-medium text-ink-main"
      : "text-ink-muted hover:bg-canvas-soft hover:text-ink-main"
  }`;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const showArchived = archived === "true";

  const { orgId } = await getCurrentOrg();
  const contacts = await getAllContacts(orgId, showArchived);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/contacts" className={tabClass(!showArchived)}>
          Active
        </Link>
        <Link href="/contacts?archived=true" className={tabClass(showArchived)}>
          Archived
        </Link>
      </div>

      <ContactsGrid
        contacts={contacts}
        emptyMessage={showArchived ? "No archived leads." : "No contacts yet."}
      />
    </div>
  );
}
