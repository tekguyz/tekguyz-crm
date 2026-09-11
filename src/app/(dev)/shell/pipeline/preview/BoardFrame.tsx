import Link from "next/link";
import type { ReactNode } from "react";

import { FilterTabs } from "@/components/leads/FilterTabs";

// THE SHIPPED SHELL'S GEOMETRY, SO THE MEASUREMENT MEANS SOMETHING.
//
// This prompt asks for one number per variant: cards visible per column
// without scrolling at 1440x800. That number is only honest if the board gets
// exactly the box it gets in /pipeline, so this frame reproduces every
// dimension above and beside it:
//
//   sidebar   w-60 (240px, expanded)          — Sidebar.tsx
//   header    h-14 (56px) + hairline          — Header.tsx
//   main      p-6 (24px)                      — AppShell.tsx, md and up
//   filters   the real FilterTabs + gap-4     — pipeline/page.tsx
//   board     flex h-full gap-4 pb-2          — KanbanBoard.tsx
//
// The comp's own labels — back link, variant name, thesis — live INSIDE the
// fake sidebar and header, never above the board. Putting them in a banner on
// top (as /shell/detail's PanelFrame does) would steal vertical space the real
// page never loses and understate every variant's count.
export function BoardFrame({
  variant,
  thesis,
  href,
  children,
}: {
  variant: string;
  thesis: string;
  // The variant's own route, so the two filter tabs link somewhere harmless.
  href: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh bg-canvas-soft text-ink-main">
      <aside className="flex w-60 shrink-0 flex-col gap-2 border-r border-hairline bg-canvas-pure p-4">
        <Link href="/shell/pipeline" className="text-body-sm text-accent underline underline-offset-2">
          ← All pipeline-card variants
        </Link>
        <p className="text-body-sm text-ink-muted">{thesis}</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-hairline bg-canvas-pure px-4">
          <h1 className="text-title">{variant}</h1>
        </header>

        <main className="relative flex-1 overflow-y-auto p-6">
          <div className="flex h-full flex-col gap-4">
            <FilterTabs
              tabs={[
                { label: "All leads", href, active: true },
                { label: "My leads", href: `${href}?mine=true`, active: false },
              ]}
            />
            <div className="min-h-0 flex-1">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
