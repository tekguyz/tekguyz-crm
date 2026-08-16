"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  createTask,
  fetchTasksForLead,
  toggleTaskComplete,
  type TaskFormState,
} from "@/lib/tasks/actions";
import type { Task } from "@/lib/tasks/queries";
import { formatDueAt } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";

const initialState: TaskFormState = null;

// Sibling of ActivityTimeline / NoteCaptureForm — ProfileSheet mounts all
// three directly rather than nesting them.
//
// Open/Completed is local useState, deliberately NOT the ?archived=-style
// search-param pattern Contacts uses: that's a server-side full-page
// navigation, and this sheet is a client-side portal that a navigation would
// tear down mid-interaction.
export function TasksSection({ leadId }: { leadId: string }) {
  const createTaskForLead = createTask.bind(null, leadId);
  const [state, formAction, isPending] = useActionState(createTaskForLead, initialState);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [timeZone, setTimeZone] = useState("UTC");
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [, startTransition] = useTransition();
  const [dueLocal, setDueLocal] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    fetchTasksForLead(leadId)
      .then(({ tasks: rows, timeZone: tz }) => {
        if (cancelled) return;
        setTasks(rows);
        setTimeZone(tz);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load tasks.");
      });

    return () => {
      cancelled = true;
    };
  }, [leadId, refreshKey]);

  // Clear the form and refetch only once a create actually succeeds — the
  // falling edge of isPending with no returned error, same guard EditLeadModal
  // uses to decide whether to close on submit.
  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      setDueLocal("");
      setRefreshKey((k) => k + 1);
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  function handleToggle(task: Task) {
    startTransition(async () => {
      await toggleTaskComplete(task.id, !task.completed);
      setRefreshKey((k) => k + 1);
    });
  }

  const parsedDue = new Date(dueLocal);
  const dueIso = Number.isNaN(parsedDue.getTime()) ? "" : parsedDue.toISOString();
  const visible = tasks?.filter((task) => task.completed === showCompleted) ?? [];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-label uppercase text-ink-muted">Tasks</h3>
        {/* Open/Completed is a two-state filter, so the selected tab takes the
            bordered secondary Button and the other takes ghost. v1's
            elevation-1 on the active tab is gone — v2 tabs are Level 0. */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={showCompleted ? "ghost" : "secondary"}
            size="sm"
            aria-pressed={!showCompleted}
            onClick={() => setShowCompleted(false)}
          >
            Open
          </Button>
          <Button
            type="button"
            variant={showCompleted ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={showCompleted}
            onClick={() => setShowCompleted(true)}
          >
            Completed
          </Button>
        </div>
      </div>

      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        {/* --danger, not --cold: --cold is the Going Cold SLA signal. */}
        {state?.error && <p className="text-body-sm text-danger">{state.error}</p>}
        <Input name="title" placeholder="Add a task…" required />
        <div className="flex items-end gap-2">
          <Input
            type="datetime-local"
            required
            value={dueLocal}
            onChange={(e) => setDueLocal(e.target.value)}
          />
          <input type="hidden" name="due_at" value={dueIso} />
          <Button type="submit" variant="primary" disabled={isPending} className="shrink-0">
            {isPending ? "Adding…" : "Add"}
          </Button>
        </div>
      </form>

      {error && <p className="text-body-md text-danger">{error}</p>}
      {!error && tasks === null && <p className="text-body-md text-ink-muted">Loading…</p>}
      {!error && tasks !== null && visible.length === 0 && (
        <p className="text-body-md text-ink-muted">
          {showCompleted ? "No completed tasks." : "No open tasks."}
        </p>
      )}

      {visible.length > 0 && (
        <ul className="flex flex-col gap-2">
          {visible.map((task) => (
            <li key={task.id} className="flex items-start gap-2">
              {/* No `name` and no enclosing form: this is a controlled toggle
                  that calls toggleTaskComplete directly, not a form field, so
                  there is no FormData name to preserve here. `label` is not
                  used because the task title and its due date are their own
                  two-line block beside the box; aria-label carries the
                  accessible name instead, unchanged from the native version. */}
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => handleToggle(task)}
                aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
                className="mt-0.5"
              />
              <div className="min-w-0">
                <p
                  className={`text-body-md ${task.completed ? "text-ink-muted line-through" : "text-ink-main"}`}
                >
                  {task.title}
                </p>
                <p className="text-body-sm text-ink-muted">
                  {formatDueAt(task.due_at, timeZone)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
