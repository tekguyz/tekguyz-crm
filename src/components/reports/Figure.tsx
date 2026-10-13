import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

// The icon chip wears a pill pair, spelled out so Tailwind's scanner sees every
// class (a template literal like `bg-pill-${tone}-bg` is invisible to it).
const CHIP_TONE = {
  green: "bg-pill-green-bg text-pill-green-fg",
  sky: "bg-pill-sky-bg text-pill-sky-fg",
  teal: "bg-pill-teal-bg text-pill-teal-fg",
} as const;

export type FigureTone = keyof typeof CHIP_TONE;

// One headline number and the sentence that qualifies it. The label says what
// the number counts, the figure is the number, and the note says what it does
// NOT count — a figure without that third line invites the reader to assume a
// scope it does not have.
//
// `featured` is the one number the page is about (realized revenue). It takes
// the larger Display size and its tone's colour; the others drop to H1 so the
// row has a clear first read instead of three equal cards.
//
// tabular-nums is not cosmetic here: three of these sit in a row and Inter's
// proportional digits make equal-length amounts read as different widths.
export function Figure({
  label,
  value,
  note,
  icon,
  tone,
  featured = false,
  className,
}: {
  label: string;
  value: string;
  note: ReactNode;
  icon: ReactNode;
  tone: FigureTone;
  featured?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-2 p-4", className)}>
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn("grid size-6 shrink-0 place-items-center rounded-md", CHIP_TONE[tone])}
        >
          {icon}
        </span>
        <p className="text-label text-ink-muted">{label}</p>
      </div>
      <p
        className={cn(
          "tabular-nums",
          featured ? "text-display" : "text-h1",
          featured && tone === "green" && "text-pill-green-fg",
        )}
      >
        {value}
      </p>
      <p className="text-body-sm text-ink-muted">{note}</p>
    </Card>
  );
}
