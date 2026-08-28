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
import { cn } from "@/lib/utils/cn";

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
  highlighted = false,
}: {
  task: Task;
  timeZone: string;
  onChanged: () => void;
  // True for the one row the command palette navigated to, for a couple of
  // seconds after arrival. TasksSection owns the timer and the tab selection;
  // this only renders the marker and scrolls itself into view.
  highlighted?: boolean;
}) {
  const saveTask = updateTask.bind(null, task.id);
  const [state, formAction, isPending] = useActionState(saveTask, initialState);
  const [isEditing, setIsEditing] = useState(false);
  const [dueLocal, setDueLocal] = useState(() => toDatetimeLocalValue(task.due_at));
  // CONTROLLED, not defaultValue. React 19 resets a <form action={...}> after
  // the action returns — including on failure — by calling form.reset() and
  // re-rendering, which reverted an edited title and description to the task's
  // stored values, so the form looked untouched and the correction was gone.
  // due_at was already controlled and is deliberately untouched by that fix.
  // See CLAUDE.md § Form/Action Field Parity.
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [, startTransition] = useTransition();
  const wasPending = useRef(false);
  const rowRef = useRef<HTMLLIElement>(null);

  // Same recipe OptionRow uses for the palette's roving highlight: the row
  // brings itself into view rather than an ancestor reaching in to move it.
  // `block: "nearest"` scrolls the ProfileSheet body only as far as it must,
  // so arriving at an already-visible task does not jerk the panel.
  useEffect(() => {
    if (highlighted) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

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
          <Input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Task title"
            required
          />
          <Textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
                // Cancel discards the edit, so every field goes back to the
                // task's stored values — not just the due date.
                setTitle(task.title);
                setDescription(task.description ?? "");
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

  // The arrival marker is deliberately NOT new visual language: it is
  // OptionRow's "this is the one" idiom — a solid --accent bar down the
  // leading edge over a --canvas-soft tint — reused at the same geometry, so
  // the app keeps one signal for that meaning rather than two. The tint alone
  // could not carry it (canvas-soft on canvas-pure is a near-invisible pair),
  // and this row is not focusable, so a focus ring is not available either.
  //
  // `relative` and `rounded-md` are unconditional so the pseudo-element has a
  // containing block that does not appear only in the highlighted branch. The
  // padding is cancelled by matching negative margins, so switching the marker
  // on and off shifts nothing in the list. `transition-colors` is flattened by
  // the global prefers-reduced-motion clamp.
  return (
    <li
      ref={rowRef}
      className={cn(
        "group relative flex items-start gap-2 rounded-md transition-colors",
        highlighted &&
          "-mx-2 -my-1 bg-canvas-soft px-2 py-1 before:absolute before:top-1/2 before:left-0 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-accent",
      )}
      data-highlighted={highlighted ? "true" : undefined}
    >
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
