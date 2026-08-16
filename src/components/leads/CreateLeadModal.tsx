"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createLead, type LeadFormState } from "@/lib/leads/actions";

const initialState: LeadFormState = null;

// `compact` is the collapsed sidebar rail's shape: icon only, label kept as an
// sr-only span so the control still has an accessible name. Nothing about the
// modal or the form changes with it — only the trigger.
export function CreateLeadModal({ compact = false }: { compact?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createLead, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    // Modal closes only after a submit that just finished without an error.
    if (wasPending.current && !isPending && !state?.error) {
      setOpen(false);
      formRef.current?.reset();
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

      <Modal open={open} onClose={() => setOpen(false)} title="New lead">
        <form ref={formRef} action={formAction} className="space-y-3">
          {state?.error && (
            <p className="text-body-sm rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
              {state.error}
            </p>
          )}
          {/* Field parity with createLead() is the whole point of this list:
              every name= below has a matching formData.get() in
              @/lib/leads/actions.ts, and every formData.get() there has an
              input here. Eight each way. website / lead_source /
              service_category in particular were read-but-never-rendered once
              already (see ADDENDA_LOG § Silent NULL-on-save) — swapping the
              raw <input>s for the Input primitive keeps every name attribute
              byte-for-byte, because Input forwards its props straight through
              to the underlying <input>. */}
          <Input name="client_name" placeholder="Client name" required />
          <Input name="email" type="email" placeholder="Email" required />
          <Input name="phone" placeholder="Phone" />
          <Input name="company" placeholder="Company" />
          <Input name="website" placeholder="Website" />
          <Input name="lead_source" placeholder="Lead source" />
          <Input name="service_category" placeholder="Service category" />
          <Input
            name="estimated_revenue"
            type="number"
            min="0"
            step="0.01"
            placeholder="Estimated revenue"
          />
          <Button
            type="submit"
            variant="primary"
            loading={isPending}
            className="w-full"
          >
            {isPending ? "Creating…" : "Create lead"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
