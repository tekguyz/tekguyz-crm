import { Skeleton } from "@/components/ui/Skeleton";

// The same panel, row height and two-line phone layout as ContactsList, so
// nothing jumps when the real rows swap in.
function ContactRowSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 lg:flex-nowrap lg:gap-x-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-40 max-w-full" />
          <Skeleton className="h-3 w-28 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-5 w-20 rounded-sm" />
      <span className="basis-full lg:hidden" />
      <div className="flex min-h-11 flex-1 items-center gap-1 pl-9 lg:min-h-0 lg:w-40 lg:flex-none lg:pl-0">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="size-8 rounded-md" />
      </div>
      <Skeleton className="h-3.5 w-24" />
    </div>
  );
}

export default function ContactsLoading() {
  return (
    <div className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline bg-canvas-pure">
      {Array.from({ length: 8 }).map((_, i) => (
        <ContactRowSkeleton key={i} />
      ))}
    </div>
  );
}
