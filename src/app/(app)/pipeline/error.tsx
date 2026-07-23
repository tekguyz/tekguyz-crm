"use client";

import Link from "next/link";

// Pipeline gets its own error.tsx rather than relying on (app)/error.tsx's
// generic copy: a failed getPipelineLeads() call would otherwise leave the
// user looking at what could be mistaken for an empty, lead-free Kanban
// board (both the desktop KanbanBoard and mobile FocusList render nothing
// but empty-state text per column when leads=[]) — a silent-looking failure
// is worse here than almost anywhere else in the app, per the standing
// design note in CLAUDE.md.
export default function PipelineError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-canvas-pure p-6 text-center shadow-elevation-2">
        <p className="text-base font-semibold">Couldn&apos;t load your pipeline</p>
        <p className="mt-2 text-sm text-ink-muted">
          This isn&apos;t an empty board — your leads are still there, the pipeline just failed to
          load. Try again.
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
