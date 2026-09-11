import type { ComponentType } from "react";
import { IconStar } from "@tabler/icons-react";

import { Card } from "@/components/ui/Card";
import { formatCurrency, formatDueAt, isOverdue } from "@/lib/format";
import type { Lead } from "@/lib/leads/queries";
import { cn } from "@/lib/utils/cn";
import { MOCK_CURRENCY, MOCK_TIMEZONE } from "@/app/(dev)/shell/pipeline/preview/mock-pipeline";

// THE PART ALL THREE VARIANTS SHARE, so the pick compares layout and nothing
// else. It owns the three things that must not exist twice:
//
//   1. The one Card — the real primitive, untouched. `cold` is its existing
//      Going Cold prop (dashed --cold border); nothing new is added to it.
//   2. The one cold calculation — `isOverdue` from lib/format, the same call
//      KanbanCard and FocusListCard make. Computed once here and handed to the
//      variant, so no variant can derive its own.
//   3. The one formatting of the two values — formatCurrency / formatDueAt.
//
// A variant is only a Body: it receives already-derived values and arranges
// them. That is also the shape Stage 2 will want for KanbanCard and
// FocusListCard, which today each carry an identical copy of the field block.
//
// Not interactive. The shipped card is a drag surface and opens the edit
// modal; a comp card that looked like a button and did nothing would be a dead
// control, so it is a plain Card here.

export type CardBodyProps = {
  lead: Lead;
  cold: boolean;
  revenue: string;
  due: string;
};

export type CardVariant = {
  Body: ComponentType<CardBodyProps>;
  // Padding is part of the spacing treatment under test, so each variant
  // names its own. Everything else about the card surface is Card's.
  cardClassName: string;
};

export function CompCard({ lead, variant }: { lead: Lead; variant: CardVariant }) {
  const cold = isOverdue(lead.next_action_at);
  const { Body } = variant;

  return (
    <Card cold={cold} data-lead-card="" className={cn("w-full", variant.cardClassName)}>
      <Body
        lead={lead}
        cold={cold}
        revenue={formatCurrency(lead.estimated_revenue, MOCK_CURRENCY)}
        due={formatDueAt(lead.next_action_at, MOCK_TIMEZONE)}
      />
    </Card>
  );
}

// The shipped star treatment, carried over: outline-weight Tabler star filled
// in the orange pill hue, desaturated to ink-muted when the lead is cold —
// the Going Cold rule's "desaturates" half now that the card has no status
// badge for it to act on. One copy, used by all three variants.
//
// Labelled, unlike the shipped one: the shipped star is an unlabelled svg, so
// a screen reader never learns a lead is starred.
export function StarMark({ starred, cold }: { starred: boolean; cold: boolean }) {
  if (!starred) return null;

  return (
    <IconStar
      role="img"
      aria-label="Starred"
      stroke={1.75}
      className={cn(
        "size-4 shrink-0",
        cold ? "fill-ink-muted text-ink-muted" : "fill-pill-orange-fg text-pill-orange-fg",
      )}
    />
  );
}
