import { Skeleton } from "@/components/ui/Skeleton";

// Suspense fallback for ProfileSheetController (mounted in AppShell). The
// boundary exists because useSearchParams() requires one, not because of a
// slow data fetch — in practice it resolves within the same tick as
// hydration, so this is rarely if ever visible for a perceptible moment. It
// used to be `fallback={null}` (a blank gap); replaced with the sheet's real
// shape so that on the rare frame it IS visible (e.g. the initial SSR pass
// when a deep link's ?leadId= is present), it reads as "your lead is
// opening" rather than a flash of nothing.
export function ProfileSheetSkeleton() {
  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-hairline bg-canvas-pure shadow-elevation-2 sm:max-w-lg">
      <div className="flex items-center justify-between border-b border-hairline p-6">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="size-6 rounded-md" />
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>

      <div className="p-6 pt-0">
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
