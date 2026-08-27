"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { useFormResetRestore } from "@/lib/forms/use-form-reset-restore";
import { IconPlus } from "@tabler/icons-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createLead, type LeadFormState } from "@/lib/leads/actions";

const initialState: LeadFormState = null;

// Field parity with createLead() is the whole point of this list: every key
// below has a matching formData.get() in @/lib/leads/actions.ts, and every
// formData.get() there has an input here. Eight each way. website /
// lead_source / service_category in particular were read-but-never-rendered
// once already (see ADDENDA_LOG § Silent NULL-on-save).
const FIELD_NAMES = [
  "client_name",
  "email",
  "phone",
  "company",
  "website",
  "lead_source",
  "service_category",
  "estimated_revenue",
] as const;

type FieldName = (typeof FIELD_NAMES)[number];
type Values = Record<FieldName, string>;

const EMPTY: Values = Object.fromEntries(FIELD_NAMES.map((name) => [name, ""])) as Values;

// `compact` is the collapsed sidebar rail's shape: icon only, label kept as an
// sr-only span so the control still has an accessible name. Nothing about the
// modal or the form changes with it — only the trigger.
export function CreateLeadModal({ compact = false }: { compact?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createLead, initialState);
  // CONTROLLED, not bare uncontrolled inputs, and that is load-bearing. React 19
  // resets a <form action={...}> after the action returns — including on
  // failure — by calling form.reset() on the element. Uncontrolled fields then
  // revert to their default, wiping all eight values right as the error tells
  // the operator to change one of them. The real trigger here is the
  // unique_tenant_client_email_ci collision, which returns { error } and leaves
  // the modal open. Proven in jsdom against form.reset(), the exact call React
  // makes. See CLAUDE.md § Form/Action Field Parity.
  const [values, setValues] = useState<Values>(EMPTY);
  const wasPending = useRef(false);
  // The number field needs this even though the text fields do not: React
  // restores a controlled text <input> after the post-action form.reset() on
  // its own, but an empty-able numeric one is not reliably restored without a
  // render. See the hook.
  const anchor = useRef<HTMLFormElement>(null);
  useFormResetRestore(anchor);

  const field = (name: FieldName) => ({
    name,
    value: values[name],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  useEffect(() => {
    // Modal closes only after a submit that just finished without an error.
    // Clearing state here replaces the old formRef.current?.reset() — with
    // controlled fields, state is the only thing that empties the form.
    if (wasPending.current && !isPending && !state?.error) {
      setOpen(false);
      setValues(EMPTY);
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
        <form ref={anchor} action={formAction} className="space-y-3">
          {state?.error && (
            <p className="text-body-sm rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
              {state.error}
            </p>
          )}
          <Input {...field("client_name")} placeholder="Client name" required />
          <Input {...field("email")} type="email" placeholder="Email" required />
          <Input {...field("phone")} placeholder="Phone" />
          <Input {...field("company")} placeholder="Company" />
          <Input {...field("website")} placeholder="Website" />
          <Input {...field("lead_source")} placeholder="Lead source" />
          <Input {...field("service_category")} placeholder="Service category" />
          <Input
            {...field("estimated_revenue")}
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
