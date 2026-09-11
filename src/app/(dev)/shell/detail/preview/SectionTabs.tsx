"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils/cn";
import { type SectionId } from "@/app/(dev)/shell/detail/preview/sections";

// The WAI-ARIA tab list, shared by Variant B (Tabs) and Variant D (Split).
//
// ONE IMPLEMENTATION, TWO CONSUMERS. Two comps needing the same control is
// exactly the moment a second hand-written copy gets made and starts drifting
// — the failure CLAUDE.md describes for hand-copied primitives, and the reason
// three copies of Button's variants once existed. It is a comp-local module,
// not a new entry in src/components/ui/, because CLAUDE.md's step 3 says to
// build a primitive only when it has a live consumer, and an unpicked variant
// is not one. If B or D wins, promoting this into a real Tabs primitive is the
// first thing Stage 2 does.
//
// NO outline-none. Each tab is an interactive row, and the global
// :focus-visible ring is the accessibility floor a stray outline-none deletes
// silently for every instance.
//
// Roving tabindex: exactly one tab is in the page's tab order and the arrow
// keys move between them, so a keyboard user tabs PAST the list rather than
// through five stops. This is the half of the pattern most hand-built tab
// lists skip.

const TAB_CLASS =
  "text-body-sm -mb-px shrink-0 border-b-2 px-3 py-2 font-medium transition-colors";

export function SectionTabs({
  sections,
  active,
  onChange,
  label,
  className,
}: {
  sections: { id: SectionId; label: string }[];
  active: SectionId;
  onChange: (id: SectionId) => void;
  label: string;
  className?: string;
}) {
  const tabRefs = useRef(new Map<SectionId, HTMLButtonElement>());

  function onKeyDown(e: React.KeyboardEvent) {
    const order = sections.map((section) => section.id);
    const index = order.indexOf(active);
    let next: SectionId | undefined;

    if (e.key === "ArrowRight") next = order[(index + 1) % order.length];
    if (e.key === "ArrowLeft") next = order[(index - 1 + order.length) % order.length];
    if (e.key === "Home") next = order[0];
    if (e.key === "End") next = order[order.length - 1];
    if (!next) return;

    e.preventDefault();
    onChange(next);
    tabRefs.current.get(next)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "flex shrink-0 gap-1 overflow-x-auto border-b border-hairline px-2",
        className,
      )}
    >
      {sections.map((section) => {
        const selected = active === section.id;
        return (
          <button
            key={section.id}
            type="button"
            role="tab"
            id={`tab-${section.id}`}
            aria-selected={selected}
            aria-controls={`panel-${section.id}`}
            tabIndex={selected ? 0 : -1}
            ref={(node) => {
              if (node) tabRefs.current.set(section.id, node);
              else tabRefs.current.delete(section.id);
            }}
            onClick={() => onChange(section.id)}
            className={cn(
              TAB_CLASS,
              selected
                ? // --accent on the active tab is inside its sanctioned use:
                  // this IS active navigation. One 2px rule, nothing else.
                  "border-accent text-ink-main"
                : "border-transparent text-ink-muted hover:text-ink-main",
            )}
          >
            {section.label}
          </button>
        );
      })}
    </div>
  );
}
