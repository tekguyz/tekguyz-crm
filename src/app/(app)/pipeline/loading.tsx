import { Skeleton } from "@/components/ui/Skeleton";

const COLUMN_COUNT = 4; // matches PIPELINE_STATUSES.length (NEW/DISCOVERY/QUOTED/ACTIVE)

function PipelineCardSkeleton() {
  return (
    <div className="rounded-lg border border-hairline bg-canvas-pure p-3 shadow-elevation-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

function KanbanColumnSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex min-w-64 flex-1 flex-col gap-3 rounded-lg border border-hairline bg-canvas-soft p-3">
      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-3 w-4" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
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
      <div className="hidden h-full gap-4 overflow-x-auto pb-2 lg:flex">
        {Array.from({ length: COLUMN_COUNT }).map((_, i) => (
          <KanbanColumnSkeleton key={i} rows={i === 0 ? 3 : 2} />
        ))}
      </div>
      <div className="flex flex-col gap-6 lg:hidden">
        {Array.from({ length: COLUMN_COUNT }).map((_, i) => (
          <section key={i} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-3.5 w-20" />
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
