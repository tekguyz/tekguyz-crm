import { getCurrentOrg } from "@/lib/organizations/current";
import { getPipelineLeads } from "@/lib/leads/queries";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { FocusList } from "@/components/pipeline/FocusList";
import { FilterTabs } from "@/components/leads/FilterTabs";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ mine?: string }>;
}) {
  const { mine } = await searchParams;
  const showMine = mine === "true";

  const { orgId, orgTimezone, currencyFormat, userId } = await getCurrentOrg();
  // Filtered in the query rather than in the board, so the Kanban's own
  // grouping adapter (lib/leads/pipeline.ts) is untouched and the column
  // counts stay truthful. Nothing here is coupled to any automated routing —
  // the spam shield's review queue is a separate surface entirely, and this
  // filter never sets or reads `archived`.
  const leads = await getPipelineLeads(orgId, showMine ? userId : undefined);

  return (
    <div className="flex h-full flex-col gap-4">
      <FilterTabs
        tabs={[
          { label: "All leads", href: "/pipeline", active: !showMine },
          { label: "My leads", href: "/pipeline?mine=true", active: showMine },
        ]}
      />

      {/* Responsive Pipeline Workspace (Phase 2): desktop Kanban board below
          lg, mobile-first Focus List above it — both fed by the same
          server-fetched leads and the same lib/leads/pipeline.ts adapter.

          `key` is load-bearing, not decoration. Both components seed
          useState(leads) so a drag can update optimistically, and React keeps
          that state across a re-render at the same tree position — so
          navigating between the two filters would re-run the server query and
          then display the PREVIOUS result set, with no error and a green
          build. Changing the key remounts them, which is the only thing that
          re-seeds state initialised from a prop. */}
      <div className="hidden min-h-0 flex-1 lg:block">
        <KanbanBoard
          key={showMine ? "mine" : "all"}
          leads={leads}
          orgTimezone={orgTimezone}
          currencyFormat={currencyFormat}
        />
      </div>
      <div className="lg:hidden">
        <FocusList
          key={showMine ? "mine" : "all"}
          leads={leads}
          orgTimezone={orgTimezone}
          currencyFormat={currencyFormat}
        />
      </div>
    </div>
  );
}
