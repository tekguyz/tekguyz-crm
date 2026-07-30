"use client";

import { useState } from "react";
import type { Lead } from "@/lib/leads/queries";
import { inputClass, labelClass } from "@/components/leads/edit-modal/field-styles";

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

// Where the lead sits in the pipeline: status, projected value, the SLA
// follow-up deadline that drives "Going Cold", and the starred flag.
//
// Owns `nextActionLocal` itself rather than having the shell bridge it down.
// ProfileSheet lifts state to the shell only when two siblings genuinely share
// it (its pendingVoiceNote spans ActivityTimeline and NoteCaptureForm); here
// nothing outside this group reads the value, and the hidden ISO input that
// consumes it is in this same fieldset — so lifting it would be prop-threading
// for no reason.
export function PipelineFields({ lead }: { lead: Lead }) {
  const [nextActionLocal, setNextActionLocal] = useState(() =>
    toDatetimeLocalValue(lead.next_action_at),
  );

  // Falls back to the lead's existing value rather than throwing if the
  // input is momentarily empty (e.g. mid-edit while the user is typing).
  const parsedNextAction = new Date(nextActionLocal);
  const nextActionIso = Number.isNaN(parsedNextAction.getTime())
    ? lead.next_action_at
    : parsedNextAction.toISOString();

  return (
    <>
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
    </>
  );
}
