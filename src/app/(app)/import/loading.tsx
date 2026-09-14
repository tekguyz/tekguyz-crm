import { DropzoneSkeleton } from "@/components/import/DropzoneSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

// Mirrors ImportWizardLayout's upload step — intro line, the four-step
// breadcrumb, then the dropzone. Without this file the route fell back to
// (app)/loading.tsx, which is the Today agenda's three columns.
export default function ImportLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="flex gap-2">
        {["w-14", "w-24", "w-14", "w-10"].map((w, i) => (
          <Skeleton key={i} className={`h-3 ${w}`} />
        ))}
      </div>
      <DropzoneSkeleton />
    </div>
  );
}
