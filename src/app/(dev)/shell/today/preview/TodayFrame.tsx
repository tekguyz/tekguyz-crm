import Link from "next/link";
import type { ReactNode } from "react";

// THE SHIPPED SHELL'S GEOMETRY, SO THE MEASUREMENT MEANS SOMETHING.
//
// This prompt's floor is "demo scale and a near-empty org both fit one
// viewport with nothing needing a scroll to be discovered". That number is
// only honest if the page gets exactly the box it gets on the real Today, so
// this frame reproduces every dimension above and beside it:
//
//   sidebar   w-60 (240px, expanded)          - Sidebar.tsx
//   header    h-14 (56px) + hairline          - Header.tsx
//   main      p-6 (24px)                      - AppShell.tsx, md and up
//
// Copied from pipeline/preview/BoardFrame.tsx, which established the rule the
// comp's own labels - back link, variant name, thesis - live INSIDE the fake
// sidebar and header, never above the content. Putting them in a banner on top
// would steal vertical space the real page never loses and overstate how much
// has to scroll.
//
// `relative` on <main> is not decorative: it is the shipped shell's own
// load-bearing rule (CLAUDE.md § UI/UX Design System). A static main lets
// .sr-only spans escape the scroll clip and inflate the document's height into
// a second page-length scrollbar, which on a page whose whole claim is "it
// fits in one viewport" would be the exact defect being measured for.
export function TodayFrame({
  variant,
  thesis,
  children,
}: {
  variant: string;
  thesis: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh bg-canvas-soft text-ink-main">
      <aside className="flex w-60 shrink-0 flex-col gap-2 border-r border-hairline bg-canvas-pure p-4">
        <Link href="/shell/today" className="text-body-sm text-accent underline underline-offset-2">
          ← All Today variants
        </Link>
        <p className="text-body-sm text-ink-muted">{thesis}</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-hairline bg-canvas-pure px-4">
          <h1 className="text-title">{variant}</h1>
        </header>

        <main className="relative flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
