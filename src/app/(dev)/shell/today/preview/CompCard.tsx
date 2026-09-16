import type { ComponentType } from "react";
import { IconStar } from "@tabler/icons-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatDueAt, isOverdue } from "@/lib/format";
import type { Lead } from "@/lib/leads/queries";
import { STATUS_TONE } from "@/lib/leads/status-tone";
import { cn } from "@/lib/utils/cn";
import { MOCK_CURRENCY, MOCK_TIMEZONE } from "@/app/(dev)/shell/today/preview/mock-today";

// THE PART BOTH VARIANTS SHARE, so the pick compares density and hierarchy and
// nothing else. It owns the four things that must not exist twice:
//
//   1. The one Card — the real primitive, untouched. `cold` is its existing
//      Going Cold prop (dashed --cold border); nothing new is added to it.
//   2. The one cold calculation — isOverdue from lib/format, the same call
//      LeadCard and KanbanCard make. Computed once here and handed to the
//      variant, so no variant can derive its own.
//   3. The one formatting of the two values — formatCurrency / formatDueAt.
//   4. The one stage badge, below.
//
// A variant is only a Body: it receives already-derived values and arranges
// them.
//
// Not interactive. The shipped LeadCard is a button that opens the edit
// drawer; a comp card that looked like a button and did nothing would be a
// dead control, so it is a plain Card here.

export type CardBodyProps = {
  lead: Lead;
  cold: boolean;
  revenue: string;
  due: string;
};

export type CardVariant = {
  Body: ComponentType<CardBodyProps>;
  TaskBody: ComponentType<TaskBodyProps>;
  // Padding is part of the density treatment under test, so each variant names
  // its own. Everything else about the card surface is Card's.
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

// THE ONE STAGE BADGE, AND THE REASON THIS PROMPT EXISTS.
//
// The tone comes from STATUS_TONE in lib/leads/status-tone.ts — imported, not
// restated. That module is already the single mapping /reports' StageLedger,
// the shipped LeadCard and LeadMetaStrip all read, and its own comment is the
// rule: "A stage has to look the same everywhere it appears, or the colour
// stops being a stage language and becomes decoration."
//
// WHAT CHANGES HERE, AND WHY IT IS NOT A BREACH OF THE GOING COLD RULE.
// The shipped LeadCard writes `tone={overdue ? "neutral" : STATUS_TONE[...]}`,
// so an overdue lead's stage pill goes grey. That is the "badge desaturates"
// half of the Going Cold rule, and on this page it has a side effect nobody
// chose: SLA Critical's membership test IS the overdue test, so every card in
// that lane is overdue, so every stage pill in that lane is grey. The lane the
// operator is meant to triage first is the one lane with no stage colour in
// it. That — not a missing mapping — is what makes Today read flat and grey.
//
// The fix keeps BOTH halves of the rule and stops them fighting by putting
// them on two different elements:
//
//   stage   -> STATUS_TONE, always, on its own pill. Stage language survives.
//   cold    -> Card's dashed --cold border (unchanged) PLUS a separate pill on
//              Badge's `cold` tone, which is the desaturated treatment the
//              rule asks for, now spent on a pill that means "overdue"
//              instead of eating the pill that means "quoted".
//
// Nothing is repurposed and nothing is dropped; Badge's `cold` tone is used
// for exactly the signal it was built for. Badge's `cold` tone became legal
// for this on 2026-08-17 when --cold-fg fixed its AA failure (4.58:1 light /
// 4.84:1 dark) — the shipped LeadCard's own comment notes that adopting it was
// "left as its own decision", and this is that decision, put in front of a
// human as a comp rather than taken quietly.
export function StageBadge({ lead }: { lead: Lead }) {
  return (
    <Badge tone={STATUS_TONE[lead.status] ?? "neutral"} className="shrink-0 rounded-full px-2">
      {lead.status}
    </Badge>
  );
}

// The desaturated half of Going Cold, as its own pill. Rendered only when the
// lead is cold, so an on-time card carries one pill and a cold card two.
export function ColdBadge({ cold }: { cold: boolean }) {
  if (!cold) return null;

  return (
    <Badge tone="cold" className="shrink-0 rounded-full px-2">
      Overdue
    </Badge>
  );
}

// The shipped star treatment, carried over from the pipeline comps: outline-
// weight Tabler star filled in the orange pill hue, desaturated to ink-muted
// when the lead is cold.
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

// TASKS DUE IS A CARD, NOT A ROW. The shipped TasksDueQueue renders each task
// as a full-width Card in a single-column <ul>, which at demo scale is six
// near-empty 1100px-wide rows that push all three lead lanes below the fold.
// Here a task is the same shape of card as a lead, laid out in a grid by
// CompLane, so the whole page reads as one card language.
//
// The shipped component's own rule is kept: an overdue TASK does NOT get the
// Going Cold treatment. An overdue task and a lead breaching its next_action_at
// SLA are different concepts, and sharing a visual language would imply a
// relationship that does not exist — so no `cold` prop here, and the overdue
// pill is the decorative orange one, not Badge's `cold` tone.
export type TaskBodyProps = {
  task: { id: string; title: string; client_name: string };
  overdue: boolean;
  due: string;
};

export function CompTaskCard({
  task,
  variant,
}: {
  task: { id: string; title: string; client_name: string; due_at: string };
  variant: CardVariant;
}) {
  const overdue = isOverdue(task.due_at);
  const { TaskBody } = variant;

  return (
    <Card data-task-card="" className={cn("w-full", variant.cardClassName)}>
      <TaskBody task={task} overdue={overdue} due={formatDueAt(task.due_at, MOCK_TIMEZONE)} />
    </Card>
  );
}

// The overdue pill for a TASK. Orange, the decorative status pill — see above.
export function TaskOverdueBadge({ overdue }: { overdue: boolean }) {
  if (!overdue) return null;

  return (
    <Badge tone="orange" className="shrink-0 rounded-full px-2">
      Overdue
    </Badge>
  );
}
