"use client";

import type { Lead } from "@/lib/leads/queries";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { LEAD_PANEL_WIDTH } from "@/components/leads/panel-width";
import { LeadProfilePanel } from "@/components/leads/profile/LeadProfilePanel";

// The lead read view's CONTAINER, and nothing else. Its body is
// LeadProfilePanel; everything about layout and content lives there.
//
// WHAT CHANGED IN STAGE 2, and why each part had to:
//
//  1. It is the `sheet` primitive now, side="right", not a hand-rolled
//     createPortal + motion panel with its own Escape listener and its own
//     body-scroll lock. Radix brings a focus trap, an aria-modal, Escape and
//     outside-click for free; the old panel had none of the first two. The
//     primitive also means the edit drawer and this share one container
//     rather than two that happen to look alike.
//
//  2. The width is LEAD_PANEL_WIDTH, the one constant both lead panels read.
//     This used to stop at 512px while the picked
//     edit drawer ramps to 672px - and the two occupy the SAME slot, so a
//     672px drawer next to a 512px panel makes the slot visibly resize when
//     you move between reading and editing. See panel-width.ts.
//
//  3. The old `createPortal(..., document.body)` is gone because its reason
//     is gone. It existed because this sheet was opened from inside
//     the edit view back when it was a native <dialog> (EditLeadModal),
//     and a closed <dialog> is display:none
//     for its whole subtree. The edit view is a Radix sheet now, which
//     portals its own content, so there is no <dialog> subtree to escape.
//
// p-0 overrides nothing the primitive sets for side="right" - that side ships
// no padding on purpose - it is stated so a reader does not have to go and
// check. The panel's own rows pad themselves, because their hairlines have to
// reach both edges.
export function ProfileSheet({
  lead,
  open,
  onClose,
  highlightTaskId = null,
}: {
  lead: Lead;
  open: boolean;
  onClose: () => void;
  // Set only when the sheet was opened from a task result in the command
  // palette. Passed straight through to TasksSection, which owns the tab
  // selection, the scroll and the temporary marker. Defaults to null so every
  // other caller is unchanged.
  highlightTaskId?: string | null;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="right"
        className={cn("p-0", LEAD_PANEL_WIDTH)}
        // The panel's own header carries the close button, in the row with the
        // name and the quick actions, so the primitive's floating one would be
        // a second real close control sitting on top of it.
        showClose={false}
        // Radix warns when a Dialog has no Description. This panel genuinely
        // has none to give - its content is five sections of records, not a
        // sentence - so the association is explicitly cleared rather than
        // filled with a restatement of the title.
        aria-describedby={undefined}
      >
        {/* Radix requires a Title for the dialog's accessible name. The visible
            name lives in the header row next to the avatar, so this is the
            same string, visually hidden, rather than a second heading. */}
        <SheetTitle className="sr-only">{lead.client_name}</SheetTitle>

        <LeadProfilePanel lead={lead} onClose={onClose} highlightTaskId={highlightTaskId} />
      </SheetContent>
    </Sheet>
  );
}
