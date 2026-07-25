"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateLead, archiveLead, unarchiveLead, type LeadFormState } from "@/lib/leads/actions";
import { Modal } from "@/components/ui/Modal";
import type { Lead } from "@/lib/leads/queries";
import { ProfileSheet } from "@/components/leads/profile/ProfileSheet";

const initialState: LeadFormState = null;

const inputClass =
  "w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none placeholder:text-ink-muted";
const labelClass = "mb-1 block text-xs text-ink-muted";

// datetime-local inputs work in the browser's own local timezone, with no
// offset in the value string. Converting here (client-side) rather than on
// the server means the real browser Date object — which actually knows the
// user's timezone — does the local<->UTC math, instead of the server having
// to guess a runtime timezone from an offset-less string.
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const [nextActionLocal, setNextActionLocal] = useState(() => toDatetimeLocalValue(lead.next_action_at));

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      onClose();
    }
    wasPending.current = isPending;
  }, [isPending, state, onClose]);

  // Falls back to the lead's existing value rather than throwing if the
  // input is momentarily empty (e.g. mid-edit while the user is typing).
  const parsedNextAction = new Date(nextActionLocal);
  const nextActionIso = Number.isNaN(parsedNextAction.getTime())
    ? lead.next_action_at
    : parsedNextAction.toISOString();

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

        <div>
          <label className={labelClass}>Follow-up due (Going Cold when overdue)</label>
          <input
            type="datetime-local"
            required
            value={nextActionLocal}
            onChange={(e) => setNextActionLocal(e.target.value)}
            className={inputClass}
          />
          <input type="hidden" name="next_action_at" value={nextActionIso} />
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

      {lead.archived ? (
        <form action={unarchiveLead.bind(null, lead.id)} className="mt-3 border-t border-hairline pt-3">
          <button
            type="submit"
            className="text-sm text-accent underline"
          >
            Unarchive lead
          </button>
        </form>
      ) : (
        <form action={archiveLead.bind(null, lead.id)} className="mt-3 border-t border-hairline pt-3">
          <button
            type="submit"
            onClick={(e) => {
              if (!window.confirm(`Archive ${lead.client_name}? You can restore it later from the Archived filter in Contacts.`)) {
                e.preventDefault();
              }
            }}
            className="text-sm text-ink-muted underline transition-colors hover:text-ink-main"
          >
            Archive lead
          </button>
        </form>
      )}

      <ProfileSheet lead={lead} open={profileOpen} onClose={() => setProfileOpen(false)} />
    </Modal>
  );
}
