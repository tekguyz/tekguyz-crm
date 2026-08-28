"use client";

import type { TaskSearchResult } from "@/lib/tasks/queries";
import { OptionRow } from "@/components/ui/OptionRow";

// The Tasks-group mirror of CommandResultItem: OptionRow owns the row's
// semantics and appearance, this owns which fields of a task appear on it.
//
// The completed treatment is NOT new design — it is TaskRow's existing
// convention (`text-ink-muted line-through`) reused verbatim, so a completed
// task reads identically wherever it appears.
export function CommandTaskItem({
  id,
  task,
  active,
  onSelect,
  onHover,
}: {
  id: string;
  task: TaskSearchResult;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <OptionRow id={id} selected={active} onClick={onSelect} onMouseEnter={onHover}>
      <span
        className={`text-body-md truncate ${
          task.completed ? "text-ink-muted line-through" : "font-medium"
        }`}
      >
        {task.title}
      </span>
      <span className="text-body-sm truncate text-ink-muted">{task.client_name}</span>
    </OptionRow>
  );
}
