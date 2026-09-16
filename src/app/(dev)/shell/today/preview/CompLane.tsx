"use client";

import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import type { Lead } from "@/lib/leads/queries";
import type { TaskDue } from "@/lib/tasks/queries";
import { cn } from "@/lib/utils/cn";
import {
  CompCard,
  CompTaskCard,
  type CardVariant,
} from "@/app/(dev)/shell/today/preview/CompCard";
import { LANE_CARD_CAP } from "@/app/(dev)/shell/today/preview/mock-today";

// THE ONE CAP-AND-EXPAND AFFORDANCE, built exactly once so it cannot drift
// between the two variants or between the four sections.
//
// The mechanic is the shipped pipeline board's, carried over unchanged from
// preview/CompBoard.tsx: first LANE_CARD_CAP cards, then a "+N more" control
// that expands the section in place and toggles back to "Show fewer", so
// expanding is never one-way. Secondary, not ghost — ghost's hover is
// bg-canvas-soft, which is the ground the section sits on, so a ghost button
// here would have no visible hover and no visible edge.
//
// ALL FOUR SECTIONS USE THIS, TASKS DUE INCLUDED. That is the prompt's rule
// and it is also what makes the viewport claim testable: one cap, one control,
// one place to change the number.
//
// EMPTY IS A STATE, NOT AN ABSENCE. A near-empty real org has to render inside
// one viewport too, so an empty section keeps its heading and prints the
// shipped component's own empty copy rather than collapsing — the operator is
// told "nothing overdue", which is information, instead of being shown a page
// whose sections silently moved.

export type LaneTone = "grid" | "column";

function LaneShell({
  title,
  count,
  emptyCopy,
  tone,
  children,
  footer,
}: {
  title: string;
  count: number;
  emptyCopy: string;
  tone: LaneTone;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <section aria-label={`${title} section`} className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-title">{title}</h2>
        {/* Plain muted count, not a Badge: a Badge here would be a fifth pill
            competing with the stage pills the cards below are trying to make
            scannable. The decorative palette is signal, not chrome. */}
        <span className="text-body-sm text-ink-muted tabular-nums">{count}</span>
      </div>

      {count === 0 ? (
        <p className="text-body-md text-ink-muted">{emptyCopy}</p>
      ) : (
        <div
          className={cn(
            tone === "grid"
              ? "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4"
              : "flex flex-col gap-2",
          )}
        >
          {children}
        </div>
      )}

      {footer}
    </section>
  );
}

function ExpandControl({
  hiddenCount,
  expanded,
  onToggle,
  controls,
}: {
  hiddenCount: number;
  expanded: boolean;
  onToggle: () => void;
  controls: string;
}) {
  if (hiddenCount <= 0) return null;

  return (
    <Button
      variant="secondary"
      size="sm"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
      className="w-full justify-center"
    >
      {expanded ? "Show fewer" : `+${hiddenCount} more`}
    </Button>
  );
}

// The three lead sections. `tone="column"` in both variants — they stack in a
// three-up grid supplied by the page, so each lane is a single column of cards.
export function LeadLane({
  title,
  emptyCopy,
  leads,
  variant,
}: {
  title: string;
  emptyCopy: string;
  leads: Lead[];
  variant: CardVariant;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const hiddenCount = Math.max(0, leads.length - LANE_CARD_CAP);
  const shown = expanded ? leads : leads.slice(0, LANE_CARD_CAP);

  return (
    <LaneShell
      title={title}
      count={leads.length}
      emptyCopy={emptyCopy}
      tone="column"
      footer={
        <ExpandControl
          hiddenCount={hiddenCount}
          expanded={expanded}
          onToggle={() => setExpanded((open) => !open)}
          controls={id}
        />
      }
    >
      <div id={id} className="contents">
        {shown.map((lead) => (
          <CompCard key={lead.id} lead={lead} variant={variant} />
        ))}
      </div>
    </LaneShell>
  );
}

// TASKS DUE. Identical mechanic, identical cap, identical control — the only
// difference is `tone="grid"`, which is the prompt's actual ask: a compact
// card grid in the same visual language as the lanes below, not the
// full-width single-column rows the shipped page renders.
//
// Four across at xl so the capped state is exactly one row, two at sm, one
// below that. At demo scale (six tasks) the capped state is one row and the
// expanded state is two.
export function TaskLane({ tasks, variant }: { tasks: TaskDue[]; variant: CardVariant }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const hiddenCount = Math.max(0, tasks.length - LANE_CARD_CAP);
  const shown = expanded ? tasks : tasks.slice(0, LANE_CARD_CAP);

  return (
    <LaneShell
      title="Tasks Due"
      count={tasks.length}
      emptyCopy="No tasks due."
      tone="grid"
      footer={
        <ExpandControl
          hiddenCount={hiddenCount}
          expanded={expanded}
          onToggle={() => setExpanded((open) => !open)}
          controls={id}
        />
      }
    >
      <div id={id} className="contents">
        {shown.map((task) => (
          <CompTaskCard key={task.id} task={task} variant={variant} />
        ))}
      </div>
    </LaneShell>
  );
}
