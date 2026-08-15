import type { Lead } from "@/lib/leads/queries";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

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
