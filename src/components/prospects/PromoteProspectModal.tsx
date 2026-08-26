"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { promoteProspect, type PromoteState } from "@/lib/actions/prospect-promote-actions";
import type { Prospect } from "@/lib/prospects/queries";
import {
  prospectToPromoteDefaults,
  type PromoteDefaults,
  type PromoteFieldName,
} from "@/lib/prospects/promote-payload";

const initialState: PromoteState = null;

// Turns a prospect into a real lead.
//
// FIELD PARITY (CLAUDE.md § Form/Action Field Parity) is the load-bearing
// property of this file. Every name= below appears in PROMOTE_FIELD_NAMES, and
// buildPromotePayload reads exactly that list and nothing else. All three are
// diffed against each other by promote-payload.test.ts and
// PromoteProspectModal.test.tsx, in BOTH directions — because the failure mode
// is silent: an unrendered-but-read field stores NULL on every save with no
// error at all, which is how five leads columns were lost across two incidents.
//
// The whole form lives in this one file for the same reason. A form split
// across siblings hides its own field set, so no single file shows it.
export function PromoteProspectModal({
  prospect,
  onClose,
}: {
  prospect: Prospect;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(promoteProspect, initialState);
  // CONTROLLED, not defaultValue, and that is load-bearing. React 19 resets a
  // <form action={...}> after the action returns — including on failure. With
  // uncontrolled inputs that silently wipes the one field the operator actually
  // typed (the email) and reverts every field they corrected back to its
  // prefill, right at the moment the error tells them to fix something. Proven
  // in the browser on 2026-08-26 before this was changed.
  const [values, setValues] = useState<PromoteDefaults>(() =>
    prospectToPromoteDefaults(prospect),
  );
  const wasPending = useRef(false);

  const field = (name: PromoteFieldName) => ({
    name,
    value: values[name],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  useEffect(() => {
    // Close only after a submit that actually finished and succeeded. An email
    // collision keeps the modal open with every typed value intact (see the
    // controlled-state note above), so the operator corrects one field rather
    // than retyping the whole form.
    if (wasPending.current && !isPending && state?.ok) {
      onClose();
    }
    wasPending.current = isPending;
  }, [isPending, state, onClose]);

  const failure = state && state.ok === false ? state : null;

  return (
    <Modal open onClose={onClose} title={`Promote ${prospect.name}`}>
      <form action={formAction} className="space-y-3">
        {failure ? (
          <div
            role="alert"
            className="text-body-sm space-y-2 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg"
          >
            <p>{failure.error}</p>
            {failure.existingLeadId ? (
              <Link
                href={`/prospects?leadId=${failure.existingLeadId}`}
                className="underline underline-offset-2"
                onClick={onClose}
              >
                Open the existing lead
              </Link>
            ) : null}
          </div>
        ) : null}

        <p className="text-caption text-ink-muted">
          A lead needs an email address. That is the one thing a Google Business Profile never
          gives you, and the reason this is a separate step.
        </p>

        {/* Not a user-editable field, but still declared in
            PROMOTE_FIELD_NAMES and still read by the action — so the parity
            diff covers it like any other. */}
        <input type="hidden" name="prospect_id" value={values.prospect_id} readOnly />

        <Input
          {...field("email")}
          type="email"
          label="Email"
          required
          autoFocus
          placeholder="name@business.com"
        />
        <Input
          {...field("client_name")}
          label="Contact name"
          required
          hint="Prefilled with the business name — replace it with the person you spoke to."
        />
        <Input {...field("company")} label="Company" />
        <Input {...field("phone")} label="Phone" />
        <Input {...field("website")} label="Website" />
        <Input {...field("physical_address")} label="Address" />
        <Input {...field("service_category")} label="Service category" />
        <Input {...field("lead_source")} label="Lead source" />
        <Input
          {...field("estimated_revenue")}
          type="number"
          min="0"
          step="0.01"
          label="Estimated revenue"
          placeholder="0"
        />
        <Textarea
          {...field("message")}
          label="Call notes"
          rows={3}
          hint="Stored as this lead's first enquiry record."
        />

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isPending} className="flex-1">
            {isPending ? "Promoting…" : "Promote to lead"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
