import Link from "next/link";
import { IconUpload } from "@tabler/icons-react";

import { ProspectsTable } from "@/components/prospects/ProspectsTable";
import { FilterTabs } from "@/components/leads/FilterTabs";
import { Button } from "@/components/ui/Button";
import { getCurrentOrg } from "@/lib/organizations/current";
import { getProspects } from "@/lib/prospects/queries";

// The cold-outreach call list. Deliberately NOT folded into the generalized
// Table View initiative in docs/KNOWN_GAPS.md — that one is about saved views
// across every entity, and building this inside it would mean shipping the
// generalization before anything proved what it needs to do.
export default async function ProspectsPage({
  searchParams,
}: {
  // `highlight` is written only by the CMD+K palette's Prospects group. It
  // names the row to scroll to and mark on arrival — there is no per-prospect
  // detail route to send the user to instead.
  searchParams: Promise<{ archived?: string; highlight?: string }>;
}) {
  const { archived, highlight } = await searchParams;
  const showArchived = archived === "true";

  const { orgId } = await getCurrentOrg();
  // Archived is filtered in the query, not the table, so the count the operator
  // reads is the count the database returned. Sorting and text filtering are
  // client-side over this array — see ProspectsTable for why.
  const prospects = await getProspects(orgId, showArchived);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1">Prospects</h1>
          <p className="text-body-md text-ink-muted">
            Cold outreach from the leadgen scrape. Ring one, learn an email address, then
            promote it into a real lead.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/prospects/import">
            <IconUpload className="size-4" stroke={1.75} aria-hidden="true" />
            Import CSV
          </Link>
        </Button>
      </div>

      <FilterTabs
        tabs={[
          { label: "Active", href: "/prospects", active: !showArchived },
          { label: "Archived", href: "/prospects?archived=true", active: showArchived },
        ]}
      />

      <ProspectsTable prospects={prospects} highlightProspectId={highlight ?? null} />
    </div>
  );
}
