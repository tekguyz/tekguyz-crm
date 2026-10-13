import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";

// The panel frame both Reports tables share, the same header Today's
// AgendaPanel wears: coloured icon, title, count on the right. The sentence
// that says what the table counts stays, one muted line under the title.
//
// `id` names the section for screen readers and the table inside it, which
// had no accessible name before (the heading above it was not associated).
export function ReportPanel({
  id,
  icon,
  title,
  count,
  countLabel,
  description,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  count: number;
  countLabel: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card role="region" aria-labelledby={`${id}-title`} className="overflow-hidden p-0">
      <header className="border-b border-hairline px-4 py-2.5">
        <div className="flex items-center gap-2">
          {icon}
          <h2 id={`${id}-title`} className="text-title">
            {title}
          </h2>
          <span className="text-body-sm ml-auto text-ink-muted tabular-nums">
            {count}
            <span className="sr-only"> {countLabel}</span>
          </span>
        </div>
        <p className="text-caption mt-0.5 text-ink-muted">{description}</p>
      </header>
      {children}
    </Card>
  );
}
