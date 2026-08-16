"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// This is the real "main app tree" boundary the design called for — placed
// inside the (app) route group (confirmed live during this prompt: the app
// actually uses (app)/(auth) route groups, not the flat src/app/ structure
// earlier planning docs assumed) rather than at bare src/app/error.tsx, so
// it only ever fires for authenticated pages (Today/Pipeline/Contacts/
// Settings) where "back to Agenda" is always a meaningful, safe action.
// Renders inside AppShell (Sidebar/Header stay mounted), since this segment
// is nested under (app)/layout.tsx.
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      {/* Level 0, same as the root boundary — see the note there. */}
      <Card className="w-full max-w-sm p-6 text-center">
        <p className="text-base font-semibold">Something went wrong</p>
        <p className="mt-2 text-sm text-ink-muted">
          This page hit an unexpected error. Your data is safe — try again, or head back to Today.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button type="button" variant="secondary" onClick={reset} className="w-full">
            Try again
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Back to Today</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
