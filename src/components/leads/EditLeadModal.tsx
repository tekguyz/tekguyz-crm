"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateLead, type LeadFormState } from "@/lib/leads/actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Lead } from "@/lib/leads/queries";
import { ProfileSheet } from "@/components/leads/profile/ProfileSheet";
import { IdentityFields } from "@/components/leads/edit-modal/IdentityFields";
import { AddressSocialFields } from "@/components/leads/edit-modal/AddressSocialFields";
import { PipelineFields } from "@/components/leads/edit-modal/PipelineFields";
import { OutcomeFields } from "@/components/leads/edit-modal/OutcomeFields";
import { ArchiveControls } from "@/components/leads/edit-modal/ArchiveControls";

const initialState: LeadFormState = null;

// Layout shell for the lead edit form. Owns only what's genuinely
// cross-cutting: the <form action={serverAction}> + useActionState wiring, the
// server-error banner, the submit button, the close-on-success effect, and the
// profile-sheet handoff. Each field group is a sibling under edit-modal/,
// split by concern the same way the Profile Sheet splits its own sections.
//
// The four fieldsets are uncontrolled (defaultValue) and read straight off
// FormData by updateLead, so they need no props beyond `lead` — the only
// controlled input (next_action_at) is owned inside PipelineFields, since
// nothing outside that group reads it.
export function EditLeadModal({
  lead,
  open,
  onClose,
}: {
  lead: Lead;
  open: boolean;
  onClose: () => void;
}) {
  const updateLeadWithId = updateLead.bind(null, lead.id);
  const [state, formAction, isPending] = useActionState(updateLeadWithId, initialState);
  const wasPending = useRef(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      onClose();
    }
    wasPending.current = isPending;
  }, [isPending, state, onClose]);

  return (
    <Modal open={open} onClose={onClose} title={lead.client_name}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setProfileOpen(true);
          onClose();
        }}
        className="-ml-2 mb-3 text-accent hover:text-accent"
      >
        View full profile & activity
      </Button>

      <form action={formAction} className="space-y-3">
        {state?.error && (
          <p className="text-body-md rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
            {state.error}
          </p>
        )}

        <IdentityFields lead={lead} />
        <AddressSocialFields lead={lead} />
        <PipelineFields lead={lead} />
        <OutcomeFields lead={lead} />

        <Button type="submit" variant="primary" disabled={isPending} className="w-full">
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <ArchiveControls lead={lead} />

      <ProfileSheet lead={lead} open={profileOpen} onClose={() => setProfileOpen(false)} />
    </Modal>
  );
}
