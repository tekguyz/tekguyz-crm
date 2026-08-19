"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { IconPencil, IconX } from "@tabler/icons-react";

import {
  dismissTask,
  toggleTaskComplete,
  updateTask,
  type TaskFormState,
} from "@/lib/tasks/actions";
import type { Task } from "@/lib/tasks/queries";
import { formatDueAt } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

const initialState: TaskFormState = null;

// A datetime-local input speaks the browser's local wall clock, so an ISO
// instant has to be rendered through the local offset to prefill it — the
// mirror image of the `new Date(value).toISOString()` conversion the create
// form does on the way out. toISOString() here would prefill the UTC time and
// silently shift every edited due date by the user's offset.
export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

// One task in TasksSection's list: the completion toggle, the read view, and
// the inline edit form. Split out of TasksSection because it owns its own
// action state and editing state — TasksSection stays responsible for the
// list and the create form.
export function TaskRow({
  task,
  timeZone,
  onChanged,
}: {
  task: Task;
  timeZone: string;
  onChanged: () => void;
}) {
  const saveTask = updateTask.bind(null, task.id);
  const [state, formAction, isPending] = useActionState(saveTask, initialState);
  const [isEditing, setIsEditing] = useState(false);
  const [dueLocal, setDueLocal] = useState(() => toDatetimeLocalValue(task.due_at));
  const [, startTransition] = useTransition();
  const wasPending = useRef(false);

  // Close and refetch only on the falling edge of isPending with no returned
  // error — the same success guard TasksSection uses for create.
  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setIsEditing(false);
      onChanged();
    }
    wasPending.current = isPending;
  }, [isPending, state, onChanged]);

  function handleToggle() {
    startTransition(async () => {
      await toggleTaskComplete(task.id, !task.completed);
      onChanged();
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      await dismissTask(task.id);
      onChanged();
    });
  }

  const parsedDue = new Date(dueLocal);
  const dueIso = Number.isNaN(parsedDue.getTime()) ? "" : parsedDue.toISOString();

  if (isEditing) {
    return (
      <li>
        {/* Field parity: title / description / due_at are rendered here and
            are exactly the three keys updateTask reads. */}
        <form action={formAction} className="flex flex-col gap-2 rounded-md border border-hairline p-2">
          {state?.error && <p className="text-body-sm text-danger">{state.error}</p>}
          <Input name="title" defaultValue={task.title} aria-label="Task title" required />
          <Textarea
            name="description"
            defaultValue={task.description ?? ""}
            aria-label="Task description"
            rows={2}
            placeholder="Description (optional)"
          />
          <Input
            type="datetime-local"
            aria-label="Task due date"
            required
            value={dueLocal}
            onChange={(e) => setDueLocal(e.target.value)}
          />
          <input type="hidden" name="due_at" value={dueIso} />
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDueLocal(toDatetimeLocalValue(task.due_at));
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="group flex items-start gap-2">
      {/* No `name` and no enclosing form: this is a controlled toggle that
          calls toggleTaskComplete directly, not a form field. */}
      <Checkbox
        checked={task.completed}
        onCheckedChange={handleToggle}
        aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-body-md ${task.completed ? "text-ink-muted line-through" : "text-ink-main"}`}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-body-sm whitespace-pre-line text-ink-muted">{task.description}</p>
        )}
        <p className="text-body-sm text-ink-muted">{formatDueAt(task.due_at, timeZone)}</p>
      </div>
      {/* Always in the DOM and never hover-gated into existence — a control
          that only exists on hover is unreachable by keyboard. */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Edit ${task.title}`}
          onClick={() => setIsEditing(true)}
        >
          <IconPencil size={16} stroke={1.5} />
        </Button>
        {/* Dismiss, not delete: this sets `dismissed = true`. The row stays in
            the database. `ghost`, not `danger` — nothing is destroyed. */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Dismiss ${task.title}`}
          onClick={handleDismiss}
        >
          <IconX size={16} stroke={1.5} />
        </Button>
      </div>
    </li>
  );
}
