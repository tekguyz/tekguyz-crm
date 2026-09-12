"use client";

import { useRef, useState } from "react";

import { useFormResetRestore } from "@/lib/forms/use-form-reset-restore";
import type { Lead } from "@/lib/leads/queries";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

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
  // CONTROLLED, not defaultValue. React 19 resets a <form action={...}> after
  // the action returns, failure included, and this group shares one <form> with
  // four sibling files — so an uncontrolled field here loses its edit even when
  // every other group is fixed. See CLAUDE.md § Form/Action Field Parity.
  const [status, setStatus] = useState(lead.status);
  const [estimatedRevenue, setEstimatedRevenue] = useState(
    lead.estimated_revenue === null || lead.estimated_revenue === undefined
      ? ""
      : String(lead.estimated_revenue),
  );
  const [starred, setStarred] = useState(lead.is_starred);

  // Radix's Checkbox restores its own mount-time value on a form reset, so
  // controlling it is necessary but not sufficient — see the hook for why, and
  // why intent is recorded from onClick rather than onCheckedChange.
  const starredIntent = useRef(lead.is_starred);
  const anchor = useRef<HTMLDivElement>(null);
  useFormResetRestore(anchor, () => setStarred(starredIntent.current));

  // Falls back to the lead's existing value rather than throwing if the
  // input is momentarily empty (e.g. mid-edit while the user is typing).
  const parsedNextAction = new Date(nextActionLocal);
  const nextActionIso = Number.isNaN(parsedNextAction.getTime())
    ? lead.next_action_at
    : parsedNextAction.toISOString();

  return (
    <div ref={anchor} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="NEW">New</option>
          <option value="DISCOVERY">Discovery</option>
          <option value="QUOTED">Quoted</option>
          <option value="ACTIVE">Active</option>
        </Select>
        <Input
          label="Estimated revenue"
          name="estimated_revenue"
          type="number"
          min="0"
          step="0.01"
          value={estimatedRevenue}
          onChange={(e) => setEstimatedRevenue(e.target.value)}
        />
      </div>

      <div>
        <Input
          label="Follow-up due (Going Cold when overdue)"
          type="datetime-local"
          required
          value={nextActionLocal}
          onChange={(e) => setNextActionLocal(e.target.value)}
        />
        {/* The visible field is local-time and unnamed; this hidden sibling is
            the only next_action_at in the FormData. */}
        <input type="hidden" name="next_action_at" value={nextActionIso} />
      </div>

      {/* Form/Action Field Parity: updateLead reads
          formData.get("is_starred") === "on". Radix's box is a <button>, so the
          name is carried by the hidden native checkbox it keeps in the form —
          dropping `name` here would NULL the column with no error. Pinned by a
          new FormData assertion in PipelineFields.test.tsx.
          Checkbox's own `label` prop replaces the wrapping <label>: a <label>
          around a <button> does not toggle it the way it toggles an <input>. */}
      <Checkbox
        name="is_starred"
        checked={starred}
        onClick={() => {
          starredIntent.current = !starred;
        }}
        onCheckedChange={(checked) => setStarred(checked === true)}
        label="Starred"
      />
    </div>
  );
}
