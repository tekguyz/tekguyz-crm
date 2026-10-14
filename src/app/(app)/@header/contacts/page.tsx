import { Suspense } from "react";

import { CreateLeadDrawer } from "@/components/leads/CreateLeadDrawer";
import { HeaderCount, HeaderCountSkeleton, PageHeader } from "@/components/shell/PageHeader";
import { getAllContacts } from "@/lib/leads/queries";
import { getCurrentOrg } from "@/lib/organizations/current";
import { parseView, stagesKey, type RawSearchParams } from "@/lib/views/params";

type SearchParams = Promise<RawSearchParams>;

// The same call the page makes, argument for argument, so cache() serves both
// from one query and the count is the list's own: what the database returned
// for these filters, so an empty or short list is never ambiguous.
async function ContactsCount({ searchParams }: { searchParams: SearchParams }) {
  const view = parseView("contacts", await searchParams);
  const { orgId, userId } = await getCurrentOrg();
  const contacts = await getAllContacts(
    orgId,
    view.archived,
    view.mine ? userId : undefined,
    stagesKey(view.stages),
  );
  return <HeaderCount n={contacts.length} noun={contacts.length === 1 ? "contact" : "contacts"} />;
}

export default function ContactsHeader({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageHeader
      href="/contacts"
      count={
        <Suspense fallback={<HeaderCountSkeleton />}>
          <ContactsCount searchParams={searchParams} />
        </Suspense>
      }
      actions={<CreateLeadDrawer />}
    />
  );
}
