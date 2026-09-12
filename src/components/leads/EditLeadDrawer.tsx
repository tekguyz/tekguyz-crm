"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IconX } from "@tabler/icons-react";

import { updateLead, type LeadFormState } from "@/lib/leads/actions";
import type { Lead } from "@/lib/leads/queries";
import { canEditLeadLifecycle } from "@/lib/organizations/roles";
import { Button } from "@/components/ui/Button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { LEAD_PANEL_WIDTH } from "@/components/leads/panel-width";
import { ProfileSheet } from "@/components/leads/profile/ProfileSheet";
import { FormSection } from "@/components/leads/edit-form/FormSection";
import { IdentityFields } from "@/components/leads/edit-form/IdentityFields";
import { AddressSocialFields } from "@/components/leads/edit-form/AddressSocialFields";
import { PipelineFields } from "@/components/leads/edit-form/PipelineFields";
import { AssignmentField } from "@/components/leads/edit-form/AssignmentField";
import { OutcomeFields } from "@/components/leads/edit-form/OutcomeFields";
import { ArchiveControls } from "@/components/leads/edit-form/ArchiveControls";
import { useOrgRole } from "@/components/shell/RoleContext";

const initialState: LeadFormState = null;

// THE PICKED EDIT VIEW, WIRED - Variant Drawer, "everything in the drawer"
// (picked 2026-09-12), replacing the 448px Modal this form used to live in.
//
// Layout shell only. It owns what is genuinely cross-cutting: the
// <form action={serverAction}> + useActionState wiring, which groups are open,
// the server-error banner, the pinned action bar, the close-on-success effect
// and the profile-sheet handoff. Each field group is still a sibling under
// edit-form/, split by concern - no group's field set moved.
//
// THREE THINGS BUY BACK THE SCROLLING, and none of them is width. Measured in
// Stage 1 at 448px against 768px: the real eighteen-field form's height
// changed by ZERO pixels, because the two-column grid inside the groups runs
// off Tailwind's `sm:` VIEWPORT breakpoint and not the panel. What works is
// (1) the two-up grid inside each group, (2) two of the four groups starting
// collapsed, and (3) the action bar being pinned outside the scroller, so Save
// is one click from anywhere instead of the last thing in a long column.
//
// Width still earns its place, for a different complaint: LEAD_PANEL_WIDTH is
// the ramp the read panel uses too, and the two share one slot on screen.
//
// WHICH GROUPS START CLOSED is a judgement, not a fact: Identity and Pipeline
// are what an operator touches on most edits; Address & social profiles is
// captured once and rarely corrected, and Outcome only means anything when a
// lead closes. A closed group keeps every input MOUNTED - see FormSection.
export function EditLeadDrawer({
  lead,
  open,
  onClose,
}: {
  lead: Lead;
  open: boolean;
  onClose: () => void;
}) {
  const role = useOrgRole();
  const updateLeadWithId = updateLead.bind(null, lead.id);
  const [state, formAction, isPending] = useActionState(updateLeadWithId, initialState);
  const wasPending = useRef(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    identity: true,
    pipeline: true,
    reach: false,
    outcome: false,
  });

  const toggle = (id: keyof typeof openSections) =>
    setOpenSections((current) => ({ ...current, [id]: !current[id] }));

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      onClose();
    }
    wasPending.current = isPending;
  }, [isPending, state, onClose]);

  // OutcomeFields renders two HIDDEN inputs carrying the current values for a
  // MEMBER instead of two controls - `updateLead` writes outcome,
  // actual_revenue and closed_at unconditionally, so a form that simply omits
  // the names posts null for all three and the role trigger then rejects the
  // whole save. Those hidden inputs must stay in the form, but a collapsible
  // header saying "Outcome 2" over an empty panel would be a lie. So for a
  // MEMBER the group's chrome is dropped and the inputs are rendered bare.
  const showOutcomeGroup = canEditLeadLifecycle(role);

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
      >
        <SheetContent
          side="right"
          className={cn("p-0", LEAD_PANEL_WIDTH)}
          showClose={false}
          aria-describedby={undefined}
        >
          {/* Header chrome matching the read panel's: hairline bottom border,
              px-4 py-3, a truncating title against shrink-0 controls. */}
          <div className="flex shrink-0 items-center gap-2 border-b border-hairline px-4 py-3">
            <SheetTitle className="text-title min-w-0 flex-1 truncate">
              {lead.client_name}
            </SheetTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setProfileOpen(true);
                onClose();
              }}
              className="shrink-0 text-accent hover:text-accent"
            >
              View full profile
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close"
              className="size-7 shrink-0 px-0"
            >
              <IconX stroke={1.75} aria-hidden className="size-4" />
            </Button>
          </div>

          <form action={formAction} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Counts are the number of FIELDS each sibling file renders,
                  read from those files rather than guessed:
                  IdentityFields 7, PipelineFields 4 + AssignmentField 1,
                  AddressSocialFields 4, OutcomeFields 2. Eighteen in all. */}
              <FormSection
                id="identity"
                label="Identity"
                count={7}
                open={openSections.identity}
                onToggle={() => toggle("identity")}
              >
                <IdentityFields lead={lead} />
              </FormSection>

              <FormSection
                id="pipeline"
                label="Pipeline"
                count={5}
                open={openSections.pipeline}
                onToggle={() => toggle("pipeline")}
              >
                <PipelineFields lead={lead} />
                {/* No `role` prop, unlike Outcome and Archive below:
                    assignment has full MEMBER parity and is offered to every
                    role. */}
                <AssignmentField lead={lead} />
              </FormSection>

              <FormSection
                id="reach"
                label="Address & social profiles"
                count={4}
                open={openSections.reach}
                onToggle={() => toggle("reach")}
              >
                <AddressSocialFields lead={lead} />
              </FormSection>

              {showOutcomeGroup ? (
                <FormSection
                  id="outcome"
                  label="Outcome"
                  count={2}
                  open={openSections.outcome}
                  onToggle={() => toggle("outcome")}
                >
                  <OutcomeFields lead={lead} role={role} />
                </FormSection>
              ) : (
                <OutcomeFields lead={lead} role={role} />
              )}

              {/* Inside the <form> rather than after it, because the pinned
                  bar below is now the form's last child and anything after it
                  would sit under the fold. ArchiveControls posts no FormData
                  field and owns no <form> of its own - every control in it is
                  type="button" and its confirm dialog is portalled out of this
                  tree - so it cannot be submitted by accident. It renders
                  nothing at all for a MEMBER. */}
              <div className="px-4 py-3">
                <ArchiveControls lead={lead} role={role} />
              </div>
            </div>

            {/* THE PINNED ACTION BAR, and it is what actually answers "I always
                have to scroll to the bottom". In the modal this replaced, Save
                was the last thing in a scrolling column, so reaching it meant
                scrolling past every field whether or not you touched one. */}
            <div className="flex shrink-0 flex-col gap-2 border-t border-hairline bg-canvas-pure px-4 py-3">
              {state?.error && (
                <p className="text-body-sm rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
                  {state.error}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Button type="submit" variant="primary" loading={isPending}>
                  {isPending ? "Saving…" : "Save changes"}
                </Button>
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* OUTSIDE the Sheet, not inside it. Radix unmounts a Sheet's content
          when it closes, and the handoff above closes this drawer in the same
          click that opens the profile panel - nested, the panel would be torn
          down the instant it was asked for. */}
      <ProfileSheet lead={lead} open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
