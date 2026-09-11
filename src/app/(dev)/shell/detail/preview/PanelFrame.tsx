import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

// The slide-over shell from plancrm-drawer.webp's TAKE line: dimmed backdrop,
// panel in from the right. Static — always open, no motion, no portal.
//
// SCOPED TO A CONTAINER, NOT `fixed`. The shipped ProfileSheet is `fixed` and
// portalled to document.body for a real reason (it opens from inside a
// <dialog>, whose closed subtree is display:none). A comp has neither problem,
// and `fixed` here would pin the panel to the window and cover this page's own
// "back to the index" link. Same trade Prompt 1's PhoneFrame made with the tab
// bar's `absolute` override.
//
// The greyed rows behind the backdrop are there so the panel is judged sitting
// over something, the way it will be in /pipeline — not floating on an empty
// canvas, which flatters any panel.
const BACKDROP_ROWS = [
  "Denise Okafor · BrightWave Solar",
  "Marcus Rivera · RiverStone Roofing Co.",
  "Amanda Chu · GreenScape Landscaping",
  "Tyler Brooks · Precision Auto Detailing",
  "Jordan Whitfield · Whitfield & Sons Plumbing",
];

export function PanelFrame({
  variant,
  thesis,
  width = "max-w-lg",
  children,
}: {
  variant: string;
  thesis: string;
  // Split needs a genuinely wider panel to hold two columns; every other
  // variant keeps the shipped panel's own max-w-lg so their densities are
  // compared at the real width.
  width?: string;
  children: ReactNode;
}) {
  return (
    <main className="relative h-dvh overflow-hidden bg-canvas-soft text-ink-main">
      <div className="flex h-full flex-col gap-3 p-6">
        <div>
          <Link href="/shell/detail" className="text-body-sm text-accent underline underline-offset-2">
            ← All detail-panel variants
          </Link>
          <h1 className="text-h1 mt-1">{variant}</h1>
          <p className="text-body-sm max-w-[60ch] text-ink-muted">{thesis}</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          {BACKDROP_ROWS.map((row) => (
            <Card key={row} className="shrink-0 p-3">
              <p className="text-body-md">{row}</p>
            </Card>
          ))}
        </div>
      </div>

      <div aria-hidden className="absolute inset-0 bg-ink-main/40" />

      <section
        aria-label={`${variant} detail panel`}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col border-l border-hairline bg-canvas-pure shadow-elevation-2",
          width,
        )}
      >
        {children}
      </section>
    </main>
  );
}
