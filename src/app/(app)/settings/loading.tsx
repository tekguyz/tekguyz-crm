import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

function PanelSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <Skeleton className="mb-4 h-4 w-32" />
      {children}
    </Card>
  );
}

// Three stacked panels, matching OrgDetailsPanel / TeamPanel / ApiKeysPanel's
// real shapes (form-field rows vs. list rows) rather than one repeated block.
export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <PanelSkeleton>
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-1/2" />
        </div>
      </PanelSkeleton>

      <PanelSkeleton>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </PanelSkeleton>

      <PanelSkeleton>
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </PanelSkeleton>
    </div>
  );
}
