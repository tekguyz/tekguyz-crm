import type { Lead } from "@/lib/leads/queries";
import { inputClass, labelClass } from "@/components/leads/edit-modal/field-styles";

// How the lead closed. Its own group rather than part of PipelineFields because
// outcome/actual_revenue are terminal facts the analytics cron reads to separate
// realized from projected revenue — distinct from the in-flight pipeline state
// above it, and visually separated by its own hairline in the original markup.
//
// updateLead() decides whether actual_revenue is persisted or nulled based on
// outcome, and stamps closed_at only on the first transition — none of that
// logic lives here, unchanged by this split.
export function OutcomeFields({ lead }: { lead: Lead }) {
  return (
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
  );
}
