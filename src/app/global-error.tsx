"use client";

import "./globals.css";

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
        <div className="w-full max-w-sm rounded-lg border border-hairline bg-canvas-pure p-6 text-center shadow-elevation-2">
          <p className="text-base font-semibold">Something went wrong</p>
          <p className="mt-2 text-sm text-ink-muted">
            The app hit an unexpected error and couldn&apos;t recover. Try reloading — if this
            keeps happening, let us know.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 w-full rounded-md border border-hairline px-3.5 py-1 text-sm font-medium shadow-elevation-1 transition-colors hover:bg-canvas-soft"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
