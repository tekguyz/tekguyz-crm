import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

const COLUMN_COUNT = 4; // matches PIPELINE_STATUSES.length (NEW/DISCOVERY/QUOTED/ACTIVE)

// The shape of the real card (PipelineCardFields): avatar, name and amount;
// the company line; the due line.
function PipelineCardSkeleton() {
  return (
    <Card className="flex flex-col gap-1 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Skeleton className="size-5 shrink-0 rounded-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
        <Skeleton className="h-3.5 w-12" />
      </div>
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
    </Card>
  );
}

// No box around the lane, like the real one: only a header and the cards.
function KanbanColumnSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex min-w-64 flex-1 flex-col gap-2 border border-transparent p-2">
      <div className="flex items-center gap-2 px-1">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-3 w-4" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <PipelineCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Mirrors both real layouts this route renders (KanbanBoard desktop /
// FocusList mobile), same lg breakpoint split, so whichever one the viewer
// actually sees never jumps shape when the real board mounts.
export default function PipelineLoading() {
  return (
    <div className="h-full">
      <div className="hidden h-full gap-2 overflow-x-auto pb-2 lg:flex">
        {Array.from({ length: COLUMN_COUNT }).map((_, i) => (
          <KanbanColumnSkeleton key={i} rows={i === 0 ? 3 : 2} />
        ))}
      </div>
      <div className="flex flex-col gap-6 lg:hidden">
        {Array.from({ length: COLUMN_COUNT }).map((_, i) => (
          <section key={i} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-4" />
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: i === 0 ? 2 : 1 }).map((_, j) => (
                <PipelineCardSkeleton key={j} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
