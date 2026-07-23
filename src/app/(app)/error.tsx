"use client";

import Link from "next/link";

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
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-canvas-pure p-6 text-center shadow-elevation-2">
        <p className="text-base font-semibold">Something went wrong</p>
        <p className="mt-2 text-sm text-ink-muted">
          This page hit an unexpected error. Your data is safe — try again, or head back to Today.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="w-full rounded-md border border-hairline px-3.5 py-1 text-sm font-medium shadow-elevation-1 transition-colors hover:bg-canvas-soft"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full rounded-md px-3.5 py-1 text-sm text-accent transition-colors hover:bg-canvas-soft"
          >
            Back to Today
          </Link>
        </div>
      </div>
    </div>
  );
}
