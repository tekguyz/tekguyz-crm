import { DUE_PRESETS, dueForPreset } from "@/lib/leads/due-presets";
import { Button } from "@/components/ui/Button";

// Four chips under a due-date field. They set the field and nothing else: no
// `name`, so they add nothing to FormData and the form's field parity is
// unchanged. The parent turns the Date into its own input value, so the one
// local-clock conversion stays where it already lives.
//
// `type="button"` is not optional. These sit inside the task form and the lead
// form, and a default submit button would post the form on every tap.
export function DuePresets({ onPick }: { onPick: (due: Date) => void }) {
  return (
    <div role="group" aria-label="Quick due date" className="flex flex-wrap gap-1">
      {DUE_PRESETS.map((preset) => (
        <Button
          key={preset.id}
          type="button"
          variant="secondary"
          size="sm"
          className="max-sm:h-11"
          onClick={() => onPick(dueForPreset(preset.id))}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
