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

const initialState: TaskFormState = null;

const inputClass =
  "w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none placeholder:text-ink-muted";

// Same token vocabulary as ContactsPage's Active/Archived tabs, sized down a
// step for an in-sheet section header — not a reuse of that component, which
// is a server-rendered <Link> pair.
const tabClass = (active: boolean) =>
  `rounded-sm border border-hairline px-3 py-1 text-xs transition-colors ${
    active
      ? "bg-canvas-pure font-medium text-ink-main shadow-elevation-1"
      : "text-ink-muted hover:bg-canvas-soft hover:text-ink-main"
  }`;

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
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Tasks</h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setShowCompleted(false)} className={tabClass(!showCompleted)}>
            Open
          </button>
          <button type="button" onClick={() => setShowCompleted(true)} className={tabClass(showCompleted)}>
            Completed
          </button>
        </div>
      </div>

      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        {state?.error && <p className="text-xs text-cold">{state.error}</p>}
        <input name="title" placeholder="Add a task…" required className={inputClass} />
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            required
            value={dueLocal}
            onChange={(e) => setDueLocal(e.target.value)}
            className={inputClass}
          />
          <input type="hidden" name="due_at" value={dueIso} />
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
          >
            {isPending ? "Adding…" : "Add"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-cold">{error}</p>}
      {!error && tasks === null && <p className="text-sm text-ink-muted">Loading…</p>}
      {!error && tasks !== null && visible.length === 0 && (
        <p className="text-sm text-ink-muted">
          {showCompleted ? "No completed tasks." : "No open tasks."}
        </p>
      )}

      {visible.length > 0 && (
        <ul className="flex flex-col gap-2">
          {visible.map((task) => (
            <li key={task.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggle(task)}
                aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
                className="mt-0.5 size-4 shrink-0 rounded-xs border-hairline accent-accent"
              />
              <div className="min-w-0">
                <p className={`text-sm ${task.completed ? "text-ink-muted line-through" : "text-ink-main"}`}>
                  {task.title}
                </p>
                <p className="text-xs text-ink-muted">{formatDueAt(task.due_at, timeZone)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
