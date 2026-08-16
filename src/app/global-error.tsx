"use client";

import "./globals.css";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// Next.js requirement: global-error replaces the ENTIRE root layout
// (including <html>/<body>) when an error escapes the root layout itself —
// the one place in this app that can't lean on next/font's loaders (a root
// layout failure is exactly the scenario where those can't be trusted to
// have run), so this renders with the system font stack rather than
// next/font/google's Geist. Still pulls the real design tokens from
// globals.css, so canvas/ink/hairline/accent colors match the rest of the
// app rather than falling back to browser defaults.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
        className="flex min-h-screen items-center justify-center bg-canvas-soft p-6 text-ink-main"
      >
        {/* Card and Button are pure token-styled components with no data
            fetching and no next/font dependency, so they are safe to use even
            here, where the root layout has already failed. Level 0, same as the
            other three boundaries. */}
        <Card className="w-full max-w-sm p-6 text-center">
          <p className="text-base font-semibold">Something went wrong</p>
          <p className="mt-2 text-sm text-ink-muted">
            The app hit an unexpected error and couldn&apos;t recover. Try reloading — if this
            keeps happening, let us know.
          </p>
          <Button type="button" variant="secondary" onClick={reset} className="mt-6 w-full">
            Try again
          </Button>
        </Card>
      </body>
    </html>
  );
}
