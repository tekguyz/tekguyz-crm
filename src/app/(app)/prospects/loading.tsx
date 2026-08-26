import { Skeleton } from "@/components/ui/Skeleton";

// Mirrors the real page's shape — heading, filter row, then table rows — so
// nothing jumps position when the data lands.
export default function ProspectsLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <Skeleton className="h-7 w-40" />
      <div className="flex gap-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-8 w-44" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
