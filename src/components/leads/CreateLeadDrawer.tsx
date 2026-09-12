"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IconPlus, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { LEAD_PANEL_WIDTH } from "@/components/leads/panel-width";
import { CreateLeadForm } from "@/components/leads/CreateLeadForm";
import { createLead, type LeadFormState } from "@/lib/leads/actions";

const initialState: LeadFormState = null;

// The picked Drawer container, holding the create form - so creating a lead
// and editing one arrive in the same place, at the same width
// (LEAD_PANEL_WIDTH), with the same group chrome and the same pinned action
// bar. Edit is Create with values in it; the two should not look like two
// different products.
//
// This file is the container and the action wiring only. The fields, their
// controlled state and the form-reset machinery live in CreateLeadForm, which
// mounts and unmounts with the drawer - see that file for why that split is
// mechanical rather than cosmetic.
//
// `compact` is the collapsed sidebar rail's shape: icon only, label kept as an
// sr-only span so the control still has an accessible name. Nothing about the
// drawer or the form changes with it - only the trigger.
export function CreateLeadDrawer({ compact = false }: { compact?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createLead, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    // The drawer closes only after a submit that just finished without an
    // error. Nothing clears the fields here: CreateLeadForm unmounts with the
    // drawer, so its values go with it.
    if (wasPending.current && !isPending && !state?.error) {
      setOpen(false);
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        title={compact ? "New Lead" : undefined}
        className={compact ? "w-full px-0" : "w-full"}
      >
        <IconPlus className="size-5" stroke={1.75} />
        <span className={compact ? "sr-only" : undefined}>New Lead</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
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
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="size-7 shrink-0 px-0"
            >
              <IconX stroke={1.75} aria-hidden className="size-4" />
            </Button>
          </div>

          <CreateLeadForm
            formAction={formAction}
            isPending={isPending}
            error={state?.error}
            onCancel={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
