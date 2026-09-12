import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";

// The two pieces of chrome every form variant shares.
//
// FormBackdrop is the contacts list the form opens over. It exists for the
// same reason PanelFrame's greyed rows do: a container judged on an empty
// canvas flatters itself, and the whole question this prompt asks — modal,
// drawer or inline — is a question about what the form does to the thing
// behind it.
//
// SCOPED TO A CONTAINER, NEVER `fixed`. Copied in spirit, not in code, from
// detail/preview/PanelFrame.tsx: a `fixed` overlay here would pin itself to
// the window, cover this page's own back link, and — fatally for the index
// page — escape VariantThumb's transform, because a fixed element's
// containing block is the viewport. Every variant therefore positions itself
// against its own `relative` root and can be scaled down like a picture.
const BACKDROP_ROWS = [
  "Melissa Trent · Trent Family HVAC",
  "Denise Okafor · BrightWave Solar",
  "Marcus Rivera · RiverStone Roofing Co.",
  "Amanda Chu · GreenScape Landscaping",
  "Jordan Whitfield · Whitfield & Sons Plumbing",
  "Sam Patel · Patel Dental Group",
  "Rosa Delgado · Delgado Bakery",
];

export function FormBackdrop({ rows = BACKDROP_ROWS.length }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 p-6">
      <h2 className="text-h2">Contacts</h2>
      {BACKDROP_ROWS.slice(0, rows).map((row) => (
        <Card key={row} className="shrink-0 p-3">
          <p className="text-body-md">{row}</p>
        </Card>
      ))}
    </div>
  );
}

/**
 * Page chrome for one full-size variant: back link, name, thesis, and the
 * bounded `relative` box the variant positions itself inside.
 *
 * The mode switch is a pair of links rather than a control, because the two
 * modes are two URLs and a reviewer wants to be able to send one of them to
 * somebody. `create` and `edit` render the SAME component — that is the claim
 * being made, so making it easy to flip between them is the point.
 */
export function FormFrame({
  variant,
  thesis,
  href,
  mode,
  children,
}: {
  variant: string;
  thesis: string;
  href: string;
  mode: "create" | "edit";
  children: ReactNode;
}) {
  return (
    <main className="flex h-dvh flex-col bg-canvas-soft text-ink-main">
      <div className="shrink-0 border-b border-hairline bg-canvas-pure px-6 py-3">
        <Link href="/shell/form" className="text-body-sm text-accent underline underline-offset-2">
          ← All lead-form variants
        </Link>
        <h1 className="text-h1 mt-1">{variant}</h1>
        <p className="text-body-sm max-w-[70ch] text-ink-muted">{thesis}</p>
        <p className="text-caption mt-1 flex items-center gap-2">
          <Link
            href={href}
            className={mode === "edit" ? "text-ink-main" : "text-accent underline underline-offset-2"}
          >
            Edit (prefilled)
          </Link>
          <span aria-hidden="true" className="text-ink-muted">
            ·
          </span>
          <Link
            href={`${href}?mode=create`}
            className={mode === "create" ? "text-ink-main" : "text-accent underline underline-offset-2"}
          >
            Create (empty)
          </Link>
          <span aria-hidden="true" className="text-ink-muted">
            ·
          </span>
          <Link
            href={`${href}?long=1`}
            className="text-accent underline underline-offset-2"
          >
            Longest values
          </Link>
        </p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
    </main>
  );
}
