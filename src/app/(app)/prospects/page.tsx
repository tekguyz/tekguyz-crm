import type { Metadata } from "next";

import { ProspectsTable } from "@/components/prospects/ProspectsTable";
import { FilterTabs } from "@/components/leads/FilterTabs";
import { getCurrentOrg } from "@/lib/organizations/current";
import { getProspects } from "@/lib/prospects/queries";

export const metadata: Metadata = { title: "Prospects" };

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
      {/* The title, the count and Import CSV are in the page header
          (@header/prospects). */}
      <p className="text-body-md max-w-prose text-ink-muted">
        Cold outreach from the leadgen scrape. Ring one, learn an email address, then promote it
        into a real lead.
      </p>

      <FilterTabs
        label="Status"
        tabs={[
          { label: "Active", href: "/prospects", active: !showArchived },
          { label: "Archived", href: "/prospects?archived=true", active: showArchived },
        ]}
      />

      <ProspectsTable prospects={prospects} highlightProspectId={highlight ?? null} />
    </div>
  );
}
