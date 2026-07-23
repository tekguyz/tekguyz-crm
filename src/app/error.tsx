"use client";

import Link from "next/link";

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
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-canvas-pure p-6 text-center shadow-elevation-2">
        <p className="text-base font-semibold">Something went wrong</p>
        <p className="mt-2 text-sm text-ink-muted">
          This page hit an unexpected error. Try again, or head back to the start.
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
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
