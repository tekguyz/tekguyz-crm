"use client";

import type { ReactNode } from "react";
import { IconChevronDown } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

// One group of the lead form, with a full-bleed hairline under it - the same
// section language the picked read panel uses, so reading a lead and editing
// one stop being two different documents.
//
// A CLOSED GROUP STILL CARRIES ITS FIELDS. The body is hidden with the
// `hidden` attribute and is never unmounted, and that is load-bearing rather
// than an implementation detail: an unmounted input contributes nothing to
// FormData, so `updateLead` would read null for every column behind a closed
// group and NULL it on save. That is exactly the silent data-loss bug
// CLAUDE.md § Form/Action Field Parity exists to prevent, and collapsing
// sections is a brand-new way to cause it. Proven in Stage 1 by deliberately
// switching to `{open ? children : null}`, which dropped the mounted control
// count from 18 to 12.
//
// Tailwind's preflight does not defeat this: [hidden] stays display:none and
// the inputs keep contributing to FormData.
//
// The count is what makes a closed group honest - it says how much is behind
// it before you open it. Its accessible name is assembled explicitly rather
// than left to the gap between two spans, because with no whitespace text
// node between them a header's name computes as the single word "Outcome2".
//
// `collapsible` is false on the create drawer, whose two groups are always
// open: eight fields never scroll, so there is nothing to collapse, and a
// header button that cannot change anything is a dead control - it would
// announce aria-expanded and do nothing when pressed. Non-collapsible headers
// render as a plain heading row with no button at all.
export function FormSection({
  id,
  label,
  count,
  open = true,
  onToggle,
  collapsible = true,
  children,
}: {
  id: string;
  label: string;
  count: number;
  open?: boolean;
  onToggle?: () => void;
  collapsible?: boolean;
  children: ReactNode;
}) {
  const panelId = `lead-form-section-${id}`;

  return (
    <section className="border-b border-hairline">
      {collapsible ? (
        // Ghost Button, justify-start, full width - a section header is a row,
        // not a centred control. Nothing here suppresses the global
        // :focus-visible ring.
        <Button
          type="button"
          variant="ghost"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${label}, ${count} fields`}
          className="h-auto w-full justify-start gap-2 rounded-none px-4 py-3 text-ink-main"
        >
          <IconChevronDown
            aria-hidden
            stroke={1.75}
            className={cn("size-4 shrink-0 transition-transform", open ? "" : "-rotate-90")}
          />
          <span className="text-title min-w-0 truncate">{label}</span>
          <span className="text-body-sm tabular-nums text-ink-muted">{count}</span>
        </Button>
      ) : (
        // Same explicit accessible name as the button branch, and for the
        // same reason: two adjacent spans with only a CSS gap between them
        // compute as the single word "Identity7".
        <h3 aria-label={`${label}, ${count} fields`} className="text-title flex items-center gap-2 px-4 py-3">
          <span className="min-w-0 truncate">{label}</span>
          <span className="text-body-sm tabular-nums text-ink-muted">{count}</span>
        </h3>
      )}

      <div id={panelId} hidden={!open} className="flex flex-col gap-3 px-4 pb-4">
        {children}
      </div>
    </section>
  );
}
