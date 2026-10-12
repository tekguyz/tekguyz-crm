import type { Icon } from "@tabler/icons-react";

import { cn } from "@/lib/utils/cn";

// The colour of a section's icon. Literal class names so Tailwind sees them.
const TONES = {
  purple: "text-pill-purple-fg",
  green: "text-pill-green-fg",
  sky: "text-pill-sky-fg",
  teal: "text-pill-teal-fg",
  orange: "text-pill-orange-fg",
} as const;

export type SectionTone = keyof typeof TONES;

// The heading of one block in the lead panel: a coloured Tabler icon, the name,
// and a count when the block has a list. Same shape as the Today queues'
// header (AgendaPanel), so a section reads the same on both screens.
//
// The count is aria-hidden on purpose. Two adjacent spans with only a CSS gap
// between them compute as one word ("Tasks3") for a screen reader, and the jump
// strip above already announces each count as a sentence ("Tasks, 3 open").
export function PanelSectionHeading({
  icon: SectionIcon,
  tone,
  count,
  children,
}: {
  icon: Icon;
  tone: SectionTone;
  count?: number;
  children: string;
}) {
  return (
    <h3 className="text-body-md flex items-center gap-2 font-medium text-ink-main">
      <SectionIcon aria-hidden stroke={1.75} className={cn("size-4 shrink-0", TONES[tone])} />
      {children}
      {typeof count === "number" ? (
        <span aria-hidden className="text-body-sm font-normal tabular-nums text-ink-muted">
          {count}
        </span>
      ) : null}
    </h3>
  );
}
