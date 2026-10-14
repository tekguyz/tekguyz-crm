import { Suspense } from "react";

import { CreateLeadDrawer } from "@/components/leads/CreateLeadDrawer";
import { HeaderCount, HeaderCountSkeleton, PageHeader } from "@/components/shell/PageHeader";
import { getPipelineLeads } from "@/lib/leads/queries";
import { getCurrentOrg } from "@/lib/organizations/current";
import { parseView, stagesKey, type RawSearchParams } from "@/lib/views/params";

type SearchParams = Promise<RawSearchParams>;

// The same call the page makes, argument for argument, so cache() serves both
// from one query and the count is the board's own.
async function PipelineCount({ searchParams }: { searchParams: SearchParams }) {
  const view = parseView("pipeline", await searchParams);
  const { orgId, userId } = await getCurrentOrg();
  const leads = await getPipelineLeads(orgId, view.mine ? userId : undefined, stagesKey(view.stages));
  return <HeaderCount n={leads.length} noun={leads.length === 1 ? "open lead" : "open leads"} />;
}

export default function PipelineHeader({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageHeader
      href="/pipeline"
      count={
        <Suspense fallback={<HeaderCountSkeleton />}>
          <PipelineCount searchParams={searchParams} />
        </Suspense>
      }
      actions={<CreateLeadDrawer />}
    />
  );
}
