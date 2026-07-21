"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { createLead, type LeadFormState } from "@/lib/leads/actions";

const initialState: LeadFormState = null;

const inputClass =
  "w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none placeholder:text-ink-muted";

export function CreateLeadModal() {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-hairline bg-canvas-pure px-3.5 py-1 text-sm font-medium text-ink-main shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
      >
        <Plus className="size-4" />
        New Lead
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="New lead">
        <form ref={formRef} action={formAction} className="space-y-3">
          {state?.error && (
            <p className="rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
              {state.error}
            </p>
          )}
          <input name="client_name" placeholder="Client name" required className={inputClass} />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className={inputClass}
          />
          <input name="phone" placeholder="Phone" className={inputClass} />
          <input name="company" placeholder="Company" className={inputClass} />
          <input
            name="estimated_revenue"
            type="number"
            min="0"
            step="0.01"
            placeholder="Estimated revenue"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
          >
            {isPending ? "Creating…" : "Create lead"}
          </button>
        </form>
      </Modal>
    </>
  );
}
