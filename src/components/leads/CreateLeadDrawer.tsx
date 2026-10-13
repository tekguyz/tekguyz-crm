"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IconPlus, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { LEAD_PANEL_WIDTH } from "@/components/leads/panel-width";
import { CreateLeadForm } from "@/components/leads/CreateLeadForm";
import { createLead, type LeadFormState } from "@/lib/leads/actions";
import type { PipelineStatus } from "@/lib/leads/pipeline";

const initialState: LeadFormState = null;

// The sheet and its action wiring, with no trigger of its own, so more than one
// control can open it: the page header's New lead button below, and the "+ New" at
// the foot of each Pipeline lane. `status` is the stage the form opens on; the
// operator can still change it in the form.
//
// Radix mounts the content only while open, so the form (and the stage it was
// seeded with) is rebuilt on every open.
export function CreateLeadSheet({
  open,
  onOpenChange,
  status = "NEW",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status?: PipelineStatus;
}) {
  const [state, formAction, isPending] = useActionState(createLead, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    // The drawer closes only after a submit that just finished without an
    // error. Nothing clears the fields here: CreateLeadForm unmounts with the
    // drawer, so its values go with it.
    if (wasPending.current && !isPending && !state?.error) {
      onOpenChange(false);
    }
    wasPending.current = isPending;
  }, [isPending, state, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn("p-0", LEAD_PANEL_WIDTH)}
        showClose={false}
        aria-describedby={undefined}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-hairline px-4 py-3">
          <SheetTitle className="text-title min-w-0 flex-1 truncate">New lead</SheetTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="size-7 shrink-0 px-0 max-sm:size-11"
          >
            <IconX stroke={1.75} aria-hidden className="size-4" />
          </Button>
        </div>

        <CreateLeadForm
          formAction={formAction}
          isPending={isPending}
          error={state?.error}
          initialStatus={status}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

// The picked Drawer container, holding the create form - so creating a lead
// and editing one arrive in the same place, at the same width
// (LEAD_PANEL_WIDTH), with the same group chrome and the same pinned action
// bar. Edit is Create with values in it; the two should not look like two
// different products.
//
// This file is the container and the action wiring only (CreateLeadSheet above
// is the container; this is the page header's trigger for it). The fields,
// their controlled state and the form-reset machinery live in CreateLeadForm,
// which mounts and unmounts with the drawer - see that file for why that split
// is mechanical rather than cosmetic.
//
// The trigger is the page's action in the shell header (Today, Pipeline,
// Contacts). It left the sidebar on 2026-10-13 (issue #47 step 8): a phone has
// no sidebar, so a phone had no way to add a lead short of the foot of a
// Pipeline lane. Below `sm` it is a 44px icon button; the label stays its
// accessible name.
export function CreateLeadDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* primary: the page's one primary CTA, one of --accent's four
          sanctioned uses. */}
      <Button
        type="button"
        variant="primary"
        onClick={() => setOpen(true)}
        className="max-sm:size-11 max-sm:px-0"
      >
        <IconPlus aria-hidden="true" className="size-4" stroke={1.75} />
        <span className="max-sm:sr-only">New lead</span>
      </Button>

      <CreateLeadSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
