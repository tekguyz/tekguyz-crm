"use client";

import { IconArrowBackUp, IconCalendarEvent, IconChecklist } from "@tabler/icons-react";
import { PanelSectionHeading } from "@/components/leads/profile/PanelSectionHeading";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import {
  createTask,
  fetchTasksForLead,
  restoreTask,
  type TaskFormState,
} from "@/lib/tasks/actions";
import type { Task } from "@/lib/tasks/queries";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DuePresets } from "@/components/leads/profile/DuePresets";
import { TaskRow, toDatetimeLocalValue } from "@/components/leads/profile/TaskRow";
import { useArrivalHighlight } from "@/lib/hooks/use-arrival-highlight";

const initialState: TaskFormState = null;

// How long Undo is offered after a dismiss. Long enough for a thumb on a
// phone to find it, short enough that the line does not linger.
const UNDO_MS = 8000;

// A new task is due tomorrow at 9:00 unless the operator says otherwise, so
// the commonest case is title + Add instead of title + native picker + Add.
// Local wall clock, same as the picker itself.
function defaultDueLocal(): string {
  const due = new Date();
  due.setDate(due.getDate() + 1);
  due.setHours(9, 0, 0, 0);
  return toDatetimeLocalValue(due.toISOString());
}

// Sibling of ActivityTimeline / NoteCaptureForm — ProfileSheet mounts all
// three directly rather than nesting them.
//
// Open/Completed is local useState, deliberately NOT the ?archived=-style
// search-param pattern Contacts uses: that's a server-side full-page
// navigation, and this sheet is a client-side portal that a navigation would
// tear down mid-interaction.
export function TasksSection({
  leadId,
  highlightTaskId = null,
  onOpenCountChange,
}: {
  leadId: string;
  // The command palette's Tasks group opens the sheet with the id of the task
  // that was selected. Null for every other caller.
  highlightTaskId?: string | null;
  // Reports how many OPEN tasks this lead has, so the read panel's jump strip
  // can print a count it did not have to fetch a second time. Optional, so a
  // caller that does not want a count is unchanged. Never called before the
  // rows actually load - a premature 0 would be a wrong number on screen, not
  // an empty one.
  onOpenCountChange?: (count: number) => void;
}) {
  const createTaskForLead = createTask.bind(null, leadId);
  const [state, formAction, isPending] = useActionState(createTaskForLead, initialState);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [timeZone, setTimeZone] = useState("UTC");
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dueLocal, setDueLocal] = useState(defaultDueLocal);
  // The last task dismissed from this list, while Undo is on offer. One slot:
  // a second dismiss replaces the first, as in a mail client.
  const [undoable, setUndoable] = useState<Task | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
  // falling edge of isPending with no returned error, same guard EditLeadDrawer
  // uses to decide whether to close on submit.
  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      setDueLocal(defaultDueLocal());
      setRefreshKey((k) => k + 1);
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  // Selecting a task in the command palette has to do two things, and the
  // second one is easy to miss: the row must be visible before it can be
  // scrolled to. This section's Open/Completed toggle filters the list on
  // `task.completed`, so a COMPLETED target task is not in the DOM at all
  // under the default Open tab — scrolling to it would find nothing and the
  // feature would silently do nothing for exactly the rows the search is most
  // useful for. So the tab is switched to match the task first, in the hook's
  // onArrive callback. The marker and its timer are the shared hook's — the
  // Prospects group uses the identical one.
  const highlightedId = useArrivalHighlight(highlightTaskId, tasks, (task) =>
    setShowCompleted(task.completed),
  );

  // Reported from the loaded rows rather than from `visible`, which is
  // filtered by the Open/Completed toggle - the strip's number must not change
  // because someone looked at the completed tab.
  useEffect(() => {
    if (tasks) onOpenCountChange?.(tasks.filter((task) => !task.completed).length);
  }, [tasks, onOpenCountChange]);

  // Every per-task mutation (complete, edit, dismiss) lives in TaskRow and
  // reports back through this one callback, so the list has a single refetch
  // trigger rather than one per action.
  const handleChanged = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Undo lives HERE, in the panel, and not in a toast: the panel is a modal
  // sheet, so a toast outside it is aria-hidden, cannot take focus and cannot
  // be clicked while the sheet is open. Inside the list it is reachable by
  // keyboard and read out through the live region below.
  const handleDismissed = useCallback((task: Task) => {
    clearTimeout(undoTimer.current);
    setUndoable(task);
    undoTimer.current = setTimeout(() => setUndoable(null), UNDO_MS);
  }, []);
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  function handleUndo() {
    if (!undoable) return;
    const { id } = undoable;
    clearTimeout(undoTimer.current);
    setUndoable(null);
    restoreTask(id)
      .then(handleChanged)
      .catch(() => setError("Couldn't undo. Please try again."));
  }

  const parsedDue = new Date(dueLocal);
  const dueIso = Number.isNaN(parsedDue.getTime()) ? "" : parsedDue.toISOString();
  const visible = tasks?.filter((task) => task.completed === showCompleted) ?? [];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <PanelSectionHeading
          icon={IconChecklist}
          tone="green"
          count={tasks ? tasks.filter((task) => !task.completed).length : undefined}
        >
          Tasks
        </PanelSectionHeading>
        {/* Open/Completed is a two-state filter, so the selected tab takes the
            bordered secondary Button and the other takes ghost. v1's
            elevation-1 on the active tab is gone — v2 tabs are Level 0. */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={showCompleted ? "ghost" : "secondary"}
            size="sm"
            className="max-sm:h-11"
            aria-pressed={!showCompleted}
            onClick={() => setShowCompleted(false)}
          >
            Open
          </Button>
          <Button
            type="button"
            variant={showCompleted ? "secondary" : "ghost"}
            size="sm"
            className="max-sm:h-11"
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
            label="Due"
            icon={IconCalendarEvent}
            type="datetime-local"
            required
            value={dueLocal}
            onChange={(e) => setDueLocal(e.target.value)}
          />
          <input type="hidden" name="due_at" value={dueIso} />
          <Button type="submit" variant="primary" disabled={isPending} className="shrink-0 max-sm:h-11">
            {isPending ? "Adding…" : "Add"}
          </Button>
        </div>
        <DuePresets onPick={(due) => setDueLocal(toDatetimeLocalValue(due.toISOString()))} />
      </form>

      {/* Always in the DOM, so a screen reader is already listening when the
          text arrives. */}
      <div role="status">
        {undoable ? (
          <div className="text-body-sm flex items-center justify-between gap-2 rounded-md border border-hairline px-2 py-1 text-ink-muted">
            <span className="min-w-0 truncate">Dismissed “{undoable.title}”</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              className="shrink-0 text-accent hover:text-accent max-sm:h-11"
            >
              <IconArrowBackUp aria-hidden stroke={1.75} className="size-4" />
              Undo
            </Button>
          </div>
        ) : null}
      </div>

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
            <TaskRow
              key={task.id}
              task={task}
              timeZone={timeZone}
              onChanged={handleChanged}
              onDismissed={handleDismissed}
              highlighted={task.id === highlightedId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
