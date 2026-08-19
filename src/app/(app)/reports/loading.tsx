import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

// Mirrors the real page's shape — three figures over two ledgers — so nothing
// jumps position when the data lands.
export default function ReportsLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-64" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="flex flex-col gap-2 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>

      {[5, 3].map((rows, i) => (
        <Card key={i} className="space-y-3 p-4">
          <Skeleton className="h-4 w-40" />
          {Array.from({ length: rows }).map((_, r) => (
            <Skeleton key={r} className="h-4 w-full" />
          ))}
        </Card>
      ))}
    </div>
  );
}
