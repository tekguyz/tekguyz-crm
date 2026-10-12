"use client";

import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { PIPELINE_STATUS_LABELS, type PipelineStatus } from "@/lib/leads/pipeline";

// "+ New" at the foot of a lane, on the board and in the phone list alike. It
// opens the create drawer on this lane's stage, so a lead made here is already
// where the operator was looking; it is the board's only way to start a lead
// in place.
//
// Ghost, not primary: --accent in the shell is spent on the one New Lead
// button, and four more filled buttons would be four more calls to action.
// The visible word is "New" and the accessible name adds the lane, which
// contains it, so a speech-control user can still say what they see.
export function LaneAddButton({
  status,
  onAdd,
}: {
  status: PipelineStatus;
  onAdd: (status: PipelineStatus) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={`New lead in ${PIPELINE_STATUS_LABELS[status]}`}
      onClick={() => onAdd(status)}
      className="w-full justify-start max-sm:h-11"
    >
      <IconPlus aria-hidden stroke={1.75} className="size-4 shrink-0" />
      New
    </Button>
  );
}
