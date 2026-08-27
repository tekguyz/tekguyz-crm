"use client";

import { useRef, useState } from "react";

import { useFormResetRestore } from "@/lib/forms/use-form-reset-restore";

import type { Lead } from "@/lib/leads/queries";
import { Select } from "@/components/ui/Select";
import { memberLabel, useOrgMembers } from "@/components/shell/MembersContext";

// Who owns this lead. Its own sibling under edit-modal/ rather than a field
// inside PipelineFields: ownership is a different question from where a lead
// sits in the pipeline, and the split-by-responsibility rule is what keeps
// each group's field set visible in one file.
//
// Deliberately NOT role-gated, unlike its OutcomeFields and ArchiveControls
// siblings. Assignment has full OWNER/ADMIN/MEMBER parity by design — a MEMBER
// can assign a lead to anyone in the org, including themselves. The only rule
// the database enforces is that the assignee is a member of THIS lead's
// organization, which the option list already satisfies; the trigger exists
// for the paths this picker does not cover.
//
// CONTROLLED, not defaultValue. React 19 resets a <form action={...}> after the
// action returns, failure included, which silently reverted a reassignment.
// See CLAUDE.md § Form/Action Field Parity.
export function AssignmentField({ lead }: { lead: Lead }) {
  const members = useOrgMembers();
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to ?? "");
  // This group owns a <select>, which React does not restore after the
  // post-action form.reset() — see the hook for why.
  const anchor = useRef<HTMLDivElement>(null);
  useFormResetRestore(anchor);

  return (
    <div ref={anchor}>
    {/* Form/Action Field Parity: updateLead reads formData.get("assigned_to")
    and stores null for "". This <select> is always rendered — never hidden
    behind a role check — so the column can never be NULLed by a field the
    user could not see. Pinned by a FormData assertion in
    AssignmentField.test.tsx. */}
    <Select
      label="Assigned to"
      name="assigned_to"
      value={assignedTo}
      onChange={(event) => setAssignedTo(event.target.value)}
    >
      <option value="">Unassigned</option>
      {members.map((member) => (
        <option key={member.user_id} value={member.user_id}>
          {memberLabel(member)}
        </option>
      ))}
      {/* A lead can name someone who has since left the org — the removal path
          does not clear assignments yet. Without this the <select> would fall
          back to its first option and a plain save would silently reassign the
          lead to nobody, which is the silent-NULL-on-save shape all over
          again. Rendering the orphan keeps the current value selected and
          visible; picking anything else is a deliberate act. */}
      {lead.assigned_to && !members.some((m) => m.user_id === lead.assigned_to) && (
        <option value={lead.assigned_to}>Former member (no longer in this organization)</option>
      )}
    </Select>
    </div>
  );
}
