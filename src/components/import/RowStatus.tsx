import { IconAlertCircle, IconAlertTriangle, IconBan, IconCopy } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { Badge, type BadgeTone } from "@/components/ui/Badge";

// What happened to a row, as a coloured pill with an icon AND a word. Before
// this the error was orange text and the warning was grey text: colour alone,
// and the least severe row read like secondary copy.
//
//   error      pink    skipped: it failed validation, fix it and upload again
//   refused    pink    skipped: the server refused it
//   duplicate  orange  skipped: the lead is already there (a no-op, not a fault)
//   warning    orange  imports, but a junk link cell was emptied
//
// The tones follow the receipt tiles on the summary (pink "didn't make it",
// orange "no-op"), so a row and its tile agree.
const ICON_PROPS = { "aria-hidden": true, size: 12, stroke: 2 } as const;

const STATUS: Record<
  "error" | "refused" | "duplicate" | "warning",
  { label: string; tone: BadgeTone; icon: ReactNode }
> = {
  error: { label: "Skipped", tone: "pink", icon: <IconAlertTriangle {...ICON_PROPS} /> },
  refused: { label: "Refused", tone: "pink", icon: <IconBan {...ICON_PROPS} /> },
  duplicate: { label: "Duplicate", tone: "orange", icon: <IconCopy {...ICON_PROPS} /> },
  warning: { label: "Cell emptied", tone: "orange", icon: <IconAlertCircle {...ICON_PROPS} /> },
};

export type RowStatusKind = keyof typeof STATUS;

export function RowStatus({ kind }: { kind: RowStatusKind }) {
  const { label, tone, icon } = STATUS[kind];
  return (
    <Badge tone={tone}>
      {icon}
      {label}
    </Badge>
  );
}
