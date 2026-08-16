import { notFound } from "next/navigation";

import { ThemePane } from "./ThemePane";

// Dev-only reference surface for Design System v2. Lives outside the (app)
// route group deliberately, so it inherits no AppShell chrome and no view in
// the real app is affected by it.
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen bg-canvas-soft p-6 text-ink-main">
      <header className="mb-6">
        <h1 className="text-display">Design System v2 — Structural Neutral</h1>
        <p className="text-body-md mt-1 text-ink-muted">
          Every primitive, every state, both themes. Dev-only route.
        </p>
        <p className="text-caption mt-2 text-ink-muted">
          --accent was sampled from the brand mark and closed on 2026-08-14. This
          caption previously called it an unsampled placeholder; that was stale.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <ThemePane theme="light" />
        <ThemePane theme="dark" />
      </div>
    </main>
  );
}
