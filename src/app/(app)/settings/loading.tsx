import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

// Same shape as the wired page (Variant Split): one surface, four rows split by
// hairlines, a heading and explanation on the left of each row's controls.
// Row contents follow each panel's real shape — form-field rows vs. list rows.
function RowSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-hairline px-4 py-6 last:border-b-0 md:flex-row md:gap-8 md:px-6">
      <div className="space-y-2 md:w-64 md:shrink-0">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function FieldRows({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <Card className="mx-auto w-full max-w-5xl p-0">
      <RowSkeleton>
        <FieldRows count={2} />
      </RowSkeleton>
      <RowSkeleton>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </RowSkeleton>
      <RowSkeleton>
        <FieldRows count={2} />
      </RowSkeleton>
      <RowSkeleton>
        <FieldRows count={2} />
      </RowSkeleton>
    </Card>
  );
}
