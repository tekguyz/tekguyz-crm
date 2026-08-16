"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// Root-level boundary. Catches errors from the (auth) tree (login/signup/
// onboarding) and the top-level invite/[token] page — anything NOT under
// (app)/, which has its own more specific error.tsx that takes precedence
// for that subtree. Root layout itself renders neither Sidebar nor Header,
// so "known-good route" here is just "/" — middleware correctly resolves
// that to /login for an unauthenticated session anyway.
export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-soft p-6 text-ink-main">
      {/* Card, not a hand-rolled panel: v1 put this on Level 2, which v2
          reserves for modals and the command palette. An error boundary is a
          page, not an overlay, so it takes the Level 0 default. */}
      <Card className="w-full max-w-sm p-6 text-center">
        <p className="text-base font-semibold">Something went wrong</p>
        <p className="mt-2 text-sm text-ink-muted">
          This page hit an unexpected error. Try again, or head back to the start.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button type="button" variant="secondary" onClick={reset} className="w-full">
            Try again
          </Button>
          {/* asChild keeps this a real next/link navigation while taking
              Button's classes. ghost, not accent text: `secondary` above is
              already the recovery action, and two accent-weight controls in one
              stack would compete. */}
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
