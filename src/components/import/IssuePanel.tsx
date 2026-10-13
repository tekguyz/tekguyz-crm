"use client";

import { useState, type ReactNode } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

// One list of import rows (errors, emptied cells, skipped, ready) as one panel:
// coloured icon, title, count, a divided row list and a cap — the same shape as
// Today's AgendaPanel. It replaced a bare <table> per list, which put three
// look-alike tables in a row with only a grey caption to tell them apart.
//
// It sits straight on the page, not inside another bordered card, because the
// step's own section is no longer a surface (a card in a card is always wrong).
const LIMIT = 5;

export function IssuePanel({
  title,
  icon,
  description,
  items,
  count,
  expandable = true,
  footnote,
}: {
  title: string;
  icon: ReactNode;
  description?: string;
  // Already-rendered <IssueRow>s.
  items: ReactNode[];
  // The headline count; defaults to the rows given. The "ready" preview passes
  // only its first few rows but the count of all of them.
  count?: number;
  // False for the preview: it shows a taste, and expanding it to every row of a
  // large file is not what the step is for.
  expandable?: boolean;
  footnote?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, LIMIT);
  const hidden = items.length - LIMIT;

  return (
    <section className="overflow-hidden rounded-lg border border-hairline bg-canvas-pure">
      <header className="border-b border-hairline px-3 py-2.5">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-title">{title}</h3>
          <span className="text-body-sm ml-auto text-ink-muted tabular-nums">
            {(count ?? items.length).toLocaleString()}
          </span>
        </div>
        {description ? (
          <p className="text-caption mt-0.5 text-ink-muted">{description}</p>
        ) : null}
      </header>

      <ul className="divide-y divide-hairline">{visible}</ul>

      {expandable && hidden > 0 ? (
        <div className="border-t border-hairline p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full max-sm:h-11"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show fewer" : `Show all ${items.length.toLocaleString()}`}
          </Button>
        </div>
      ) : null}
      {footnote ? (
        <p className="text-caption border-t border-hairline px-3 py-2 text-ink-muted">{footnote}</p>
      ) : null}
    </section>
  );
}

// One row, two lines: avatar, name and the status pill on the first; the
// spreadsheet row and the reason on the second, indented under the name. The
// reason can be a full sentence ("Add at least one way to reach this lead: ..."),
// so it gets the whole row width instead of a squeezed right-hand column, and
// nothing needs a horizontal scroll on a phone.
export function IssueRow({
  lineNumber,
  name,
  status,
  children,
  className,
}: {
  lineNumber?: number | string;
  name: string;
  status?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <li className={cn("text-body-md px-3 py-2.5", className)}>
      <div className="flex items-center gap-2.5">
        <Avatar name={name} size="sm" />
        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
        {status ? <span className="shrink-0">{status}</span> : null}
      </div>
      {lineNumber !== undefined || children ? (
        <p className="text-body-sm mt-0.5 ps-[34px] text-ink-muted">
          {lineNumber !== undefined ? (
            <span className="tabular-nums">Row {lineNumber}</span>
          ) : null}
          {lineNumber !== undefined && children ? " · " : null}
          {children}
        </p>
      ) : null}
    </li>
  );
}
