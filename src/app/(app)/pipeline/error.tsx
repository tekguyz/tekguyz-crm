"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
      {/* Level 0, same as the root boundary — see the note there. */}
      <Card className="w-full max-w-sm p-6 text-center">
        <p className="text-base font-semibold">Couldn&apos;t load your pipeline</p>
        <p className="mt-2 text-sm text-ink-muted">
          This isn&apos;t an empty board — your leads are still there, the pipeline just failed to
          load. Try again.
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
