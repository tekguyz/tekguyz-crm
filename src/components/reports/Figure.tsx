import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";

// One headline number and the sentence that qualifies it. The label says what
// the number counts, the figure is the number, and the note says what it does
// NOT count — a figure without that third line invites the reader to assume a
// scope it does not have.
//
// tabular-nums is not cosmetic here: three of these sit in a row and Inter's
// proportional digits make equal-length amounts read as different widths.
export function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <p className="text-label text-ink-muted">{label}</p>
      <p className="text-display tabular-nums">{value}</p>
      <p className="text-body-sm text-ink-muted">{note}</p>
    </Card>
  );
}
