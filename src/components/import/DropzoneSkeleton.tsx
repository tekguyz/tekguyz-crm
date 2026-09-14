import { Skeleton } from "@/components/ui/Skeleton";

// Stands in for CsvUploadDropzone, which both importers (/import and
// /prospects/import) open on. Same dashed container and padding, so the page
// does not jump when the real dropzone swaps in.
export function DropzoneSkeleton() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-hairline bg-canvas-pure px-6 py-12">
      <Skeleton className="mb-3 size-6" />
      <Skeleton className="mb-2 h-4 w-40" />
      <Skeleton className="mb-4 h-3 w-80 max-w-full" />
      <Skeleton className="h-8 w-28" />
    </div>
  );
}
