import { getCurrentOrg } from "@/lib/organizations/current";
import { getPipelineLeads } from "@/lib/leads/queries";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { FocusList } from "@/components/pipeline/FocusList";

export default async function PipelinePage() {
  const { orgId, orgTimezone, currencyFormat } = await getCurrentOrg();
  const leads = await getPipelineLeads(orgId);

  return (
    <div className="h-full">
      {/* Responsive Pipeline Workspace (Phase 2): desktop Kanban board below
          lg, mobile-first Focus List above it — both fed by the same
          server-fetched leads and the same lib/leads/pipeline.ts adapter. */}
      <div className="hidden h-full lg:block">
        <KanbanBoard leads={leads} orgTimezone={orgTimezone} currencyFormat={currencyFormat} />
      </div>
      <div className="lg:hidden">
        <FocusList leads={leads} orgTimezone={orgTimezone} currencyFormat={currencyFormat} />
      </div>
    </div>
  );
}
