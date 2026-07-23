import { Skeleton } from "@/components/ui/Skeleton";

function LeadCardSkeleton() {
  return (
    <div className="rounded-lg border border-hairline bg-canvas-pure p-3 shadow-elevation-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

function AgendaColumnSkeleton({ rows }: { rows: number }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <Skeleton className="h-4 w-28" />
      {Array.from({ length: rows }).map((_, i) => (
        <LeadCardSkeleton key={i} />
      ))}
    </section>
  );
}

// Mirrors TodayAgenda's exact 3-column shape (SLA Critical / High Value /
// Starred), each column filled with LeadCard-shaped rows rather than one
// generic block, so the loading state doesn't jump/reflow when real data
// swaps in.
export default function TodayLoading() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <AgendaColumnSkeleton rows={3} />
      <AgendaColumnSkeleton rows={3} />
      <AgendaColumnSkeleton rows={2} />
    </div>
  );
}
