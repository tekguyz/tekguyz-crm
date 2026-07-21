"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateLead, archiveLead, type LeadFormState } from "@/lib/leads/actions";
import { Modal } from "@/components/ui/Modal";
import type { Lead } from "@/lib/leads/queries";
import { ProfileSheet } from "@/components/leads/profile/ProfileSheet";

const initialState: LeadFormState = null;

const inputClass =
  "w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none placeholder:text-ink-muted";
const labelClass = "mb-1 block text-xs text-ink-muted";

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
      <button
        type="button"
        onClick={() => {
          setProfileOpen(true);
          onClose();
        }}
        className="mb-3 text-sm text-accent underline"
      >
        View full profile & activity
      </button>

      <form action={formAction} className="space-y-3">
        {state?.error && (
          <p className="rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
            {state.error}
          </p>
        )}

        <div>
          <label className={labelClass}>Client name</label>
          <input
            name="client_name"
            defaultValue={lead.client_name}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            name="email"
            type="email"
            defaultValue={lead.email}
            required
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Phone</label>
            <input name="phone" defaultValue={lead.phone ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Company</label>
            <input name="company" defaultValue={lead.company ?? ""} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Status</label>
            <select name="status" defaultValue={lead.status} className={inputClass}>
              <option value="NEW">New</option>
              <option value="DISCOVERY">Discovery</option>
              <option value="QUOTED">Quoted</option>
              <option value="ACTIVE">Active</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Estimated revenue</label>
            <input
              name="estimated_revenue"
              type="number"
              min="0"
              step="0.01"
              defaultValue={lead.estimated_revenue}
              className={inputClass}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-main">
          <input
            type="checkbox"
            name="is_starred"
            defaultChecked={lead.is_starred}
            className="size-4 rounded-xs border-hairline accent-accent"
          />
          Starred
        </label>

        <div className="border-t border-hairline pt-3">
          <label className={labelClass}>Outcome</label>
          <select name="outcome" defaultValue={lead.outcome ?? ""} className={inputClass}>
            <option value="">Not closed</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
            <option value="ABANDONED">Abandoned</option>
          </select>
          <label className={`${labelClass} mt-2`}>Actual revenue (if closed)</label>
          <input
            name="actual_revenue"
            type="number"
            min="0"
            step="0.01"
            defaultValue={lead.actual_revenue ?? ""}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </form>

      <form action={archiveLead.bind(null, lead.id)} className="mt-3 border-t border-hairline pt-3">
        <button
          type="submit"
          className="text-sm text-ink-muted underline transition-colors hover:text-ink-main"
        >
          Archive lead
        </button>
      </form>

      <ProfileSheet lead={lead} open={profileOpen} onClose={() => setProfileOpen(false)} />
    </Modal>
  );
}
