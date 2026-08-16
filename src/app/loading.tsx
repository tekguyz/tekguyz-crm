import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

// Root fallback: covers the moment before (app)/layout.tsx's own
// getCurrentOrg() fetch resolves (Sidebar/Header don't exist yet at that
// point, so this can't be shaped like the app shell) and the (auth) tree's
// pages. Deliberately minimal and neutral rather than shaped like any one
// page — every more specific segment (Today/Pipeline/Contacts/Settings) has
// its own shape-matched loading.tsx that takes over once that layer mounts.
export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-soft p-6">
      {/* Card, standing in for the (auth) card this fallback covers — both
          are Level 0 now, so the skeleton and the real panel match. */}
      <Card className="w-full max-w-sm p-6">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-3 h-3 w-1/2" />
      </Card>
    </div>
  );
}
