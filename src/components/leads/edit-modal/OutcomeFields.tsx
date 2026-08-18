import type { Lead } from "@/lib/leads/queries";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { canEditLeadLifecycle } from "@/lib/organizations/roles";

// How the lead closed. Its own group rather than part of PipelineFields because
// outcome/actual_revenue are terminal facts the analytics cron reads to separate
// realized from projected revenue — distinct from the in-flight pipeline state
// above it, and visually separated by its own hairline in the original markup.
//
// updateLead() decides whether actual_revenue is persisted or nulled based on
// outcome, and stamps closed_at only on the first transition — none of that
// logic lives here, unchanged by this split.
//
// A MEMBER sees neither control — outcome and actual_revenue are OWNER/ADMIN-only
// at the database trigger, so for a MEMBER these are two inputs that can only
// produce an error toast on save.
//
// They are replaced by hidden inputs carrying the CURRENT values, and that is
// not optional: Form/Action Field Parity. updateLead unconditionally writes
// outcome, actual_revenue and closed_at from FormData, so a form that simply
// omits the names posts null for all three — which on a lead that has an
// outcome is a real change, and the trigger then rejects the whole save,
// blocking edits a MEMBER is allowed to make. Re-sending the unchanged values
// passes the trigger's IS DISTINCT FROM guard untouched.
export function OutcomeFields({ lead, role }: { lead: Lead; role: string }) {
  if (!canEditLeadLifecycle(role)) {
    return (
      <>
        <input type="hidden" name="outcome" value={lead.outcome ?? ""} />
        <input type="hidden" name="actual_revenue" value={lead.actual_revenue ?? ""} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-hairline pt-3">
      <Select label="Outcome" name="outcome" defaultValue={lead.outcome ?? ""}>
        <option value="">Not closed</option>
        <option value="WON">Won</option>
        <option value="LOST">Lost</option>
        <option value="ABANDONED">Abandoned</option>
      </Select>
      <Input
        label="Actual revenue (if closed)"
        name="actual_revenue"
        type="number"
        min="0"
        step="0.01"
        defaultValue={lead.actual_revenue ?? ""}
      />
    </div>
  );
}
