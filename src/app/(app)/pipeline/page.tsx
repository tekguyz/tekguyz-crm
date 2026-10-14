import type { Metadata } from "next";

import { getCurrentOrg } from "@/lib/organizations/current";
import { getPipelineLeads } from "@/lib/leads/queries";
import { PIPELINE_STATUSES } from "@/lib/leads/pipeline";
import { sortLeads } from "@/lib/leads/sort";
import { boardKey, parseView, stagesKey, type RawSearchParams } from "@/lib/views/params";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { FocusList } from "@/components/pipeline/FocusList";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { ViewBar } from "@/components/views/ViewBar";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  // The URL is the only view state (lib/views/params.ts). The @header slot
  // parses the same params and makes the same query.
  const view = parseView("pipeline", await searchParams);

  const { orgId, orgTimezone, currencyFormat, userId } = await getCurrentOrg();
  // Filtered in the query rather than in the board, so the Kanban's own
  // grouping adapter (lib/leads/pipeline.ts) is untouched and the column
  // counts stay truthful. Nothing here is coupled to any automated routing —
  // the spam shield's review queue is a separate surface entirely, and this
  // filter never sets or reads `archived`.
  const leads = await getPipelineLeads(orgId, view.mine ? userId : undefined, stagesKey(view.stages));

  // A lane the Stage filter did not pick is hidden, not shown empty.
  const lanes = view.stages.length > 0 ? view.stages : PIPELINE_STATUSES;

  // `key` is load-bearing, not decoration. The board and the Focus List seed
  // useState(leads) so a drag can update optimistically, and React keeps that
  // state across a re-render at the same tree position — so changing a filter
  // would re-run the server query and then display the PREVIOUS result set,
  // with no error and a green build. boardKey changes with every param that
  // changes the fetched leads (owner, stage) and not with sort or layout.
  const key = boardKey(view);

  return (
    <div className="flex h-full flex-col gap-4">
      <ViewBar page="pipeline" view={view} />

      {/* Desktop: the board, or the table when ?view=table. Below lg: the
          Focus List, whatever the layout param says. */}
      {view.layout === "table" ? (
        <div className="hidden min-h-0 flex-1 overflow-y-auto lg:block">
          <LeadsTable
            page="pipeline"
            leads={sortLeads(leads, view.sort, view.dir)}
            view={view}
            orgTimezone={orgTimezone}
            currencyFormat={currencyFormat}
            emptyMessage="No open leads match this view."
          />
        </div>
      ) : (
        <div className="hidden min-h-0 flex-1 lg:block">
          <KanbanBoard
            key={key}
            leads={leads}
            lanes={lanes}
            sort={view.sort}
            dir={view.dir}
            orgTimezone={orgTimezone}
            currencyFormat={currencyFormat}
          />
        </div>
      )}
      <div className="lg:hidden">
        <FocusList
          key={key}
          leads={leads}
          lanes={lanes}
          sort={view.sort}
          dir={view.dir}
          orgTimezone={orgTimezone}
          currencyFormat={currencyFormat}
        />
      </div>
    </div>
  );
}
