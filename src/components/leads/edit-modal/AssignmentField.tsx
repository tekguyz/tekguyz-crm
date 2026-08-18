"use client";

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
// Uncontrolled (defaultValue), like every other field group here, so the shell
// needs no props beyond `lead` and updateLead can read it straight off
// FormData.
export function AssignmentField({ lead }: { lead: Lead }) {
  const members = useOrgMembers();

  return (
    // Form/Action Field Parity: updateLead reads formData.get("assigned_to")
    // and stores null for "". This <select> is always rendered — never hidden
    // behind a role check — so the column can never be NULLed by a field the
    // user could not see. Pinned by a FormData assertion in
    // AssignmentField.test.tsx.
    <Select label="Assigned to" name="assigned_to" defaultValue={lead.assigned_to ?? ""}>
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
  );
}
