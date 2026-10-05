"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";

// One Today queue: a header (icon, name, count), a dense row list, and a cap.
// The cap is what keeps four queues on one screen — before it, every queue
// listed every lead and the page ran several screens long. Rows arrive already
// rendered, so the server queues stay server components.
const LIMIT = 5;

export function AgendaPanel({
  title,
  icon,
  emptyText,
  items,
}: {
  title: string;
  icon: ReactNode;
  emptyText: string;
  items: ReactNode[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, LIMIT);
  const hidden = items.length - LIMIT;

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-canvas-pure">
      <header className="flex items-center gap-2 border-b border-hairline px-3 py-2.5">
        {icon}
        <h2 className="text-title">{title}</h2>
        <span className="text-body-sm ml-auto text-ink-muted tabular-nums">{items.length}</span>
      </header>

      {items.length === 0 ? (
        <p className="text-body-md px-3 py-4 text-ink-muted">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-hairline">{visible}</ul>
      )}

      {hidden > 0 ? (
        <div className="mt-auto border-t border-hairline p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show fewer" : `Show all ${items.length}`}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
