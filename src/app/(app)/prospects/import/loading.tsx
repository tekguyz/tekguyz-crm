import { DropzoneSkeleton } from "@/components/import/DropzoneSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

// Mirrors ProspectImportPanel's opening state — a two-line intro, then the
// dropzone. Without this file the route fell back to prospects/loading.tsx,
// the call list's filter-and-table shape.
export default function ProspectImportLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-3/4 max-w-xl" />
      </div>
      <DropzoneSkeleton />
    </div>
  );
}
