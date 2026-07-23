import { Skeleton } from "@/components/ui/Skeleton";

function ContactCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-canvas-pure p-6 shadow-elevation-1">
      <div className="min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>
    </div>
  );
}

// Same responsive grid ContactsGrid itself uses, so the column count never
// shifts when real cards swap in.
export default function ContactsLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ContactCardSkeleton key={i} />
      ))}
    </div>
  );
}
