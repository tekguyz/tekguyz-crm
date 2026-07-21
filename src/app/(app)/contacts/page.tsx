import { getCurrentOrg } from "@/lib/organizations/current";
import { getAllContacts } from "@/lib/leads/queries";
import { ContactsGrid } from "@/components/contacts/ContactsGrid";

export default async function ContactsPage() {
  const { orgId } = await getCurrentOrg();
  const contacts = await getAllContacts(orgId);

  return <ContactsGrid contacts={contacts} />;
}
