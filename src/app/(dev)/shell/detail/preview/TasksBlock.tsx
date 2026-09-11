"use client";

import { useState } from "react";
import { IconPencil, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { MOCK_TASKS } from "@/app/(dev)/shell/detail/preview/mock-lead";
import type { BlockProps } from "@/app/(dev)/shell/detail/preview/SectionBlocks";

// CARRIED OVER, RESTYLED — NOT REBUILT.
//
// The Open/Completed pair and the inline add-task form already work in the
// shipped TasksSection, so this comp keeps their exact shape: two Buttons with
// aria-pressed (selected = secondary, other = ghost), then title + due + Add.
// What changed is only what this prompt is allowed to change — density. The
// shipped section stacks the title field above the due row; here they share a
// row, which buys back a line on a panel that is short of them.
//
// The form does nothing. No Server Action, no createTask, no fetch — Stage 1
// is mock data only, so `onSubmit` is prevented and the fields are decoration.
export function TasksBlock({ showHeading = true }: BlockProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const visible = MOCK_TASKS.filter((task) => task.completed === showCompleted);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {showHeading ? (
          <h3 className="text-label uppercase text-ink-muted">Tasks</h3>
        ) : (
          // Keeps the Open/Completed pair on the right when an accordion
          // header has already supplied the name.
          <span aria-hidden />
        )}
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

      <form className="flex items-end gap-2" onSubmit={(e) => e.preventDefault()}>
        {/* aria-label on both, not just a placeholder. A placeholder is not a
            label — it disappears the moment you type — and the due field had
            no placeholder at all, so it reached a screen reader as an unnamed
            field. Found in the Web Interface Guidelines pass, not by looking:
            nothing about it is visible on the page. */}
        <Input name="title" placeholder="Add a task…" aria-label="Task title" />
        <Input
          type="datetime-local"
          aria-label="Due date and time"
          className="w-[11.5rem] shrink-0"
        />
        <Button type="submit" variant="primary" className="shrink-0">
          Add
        </Button>
      </form>

      {visible.length === 0 ? (
        <p className="text-body-md text-ink-muted">
          {showCompleted ? "No completed tasks." : "No open tasks."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {visible.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-canvas-soft"
            >
              <Checkbox checked={task.completed} aria-label={task.title} />
              <div className="min-w-0 flex-1">
                <p className="text-body-md truncate">{task.title}</p>
                <p className="text-caption text-ink-muted">{task.due}</p>
              </div>
              {/* The shipped TaskRow's edit and dismiss affordances, kept so
                  the row's real width is judged, not a simplified one. */}
              <Button variant="ghost" size="sm" aria-label="Edit task" className="size-7 px-0">
                <IconPencil stroke={1.75} aria-hidden className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" aria-label="Dismiss task" className="size-7 px-0">
                <IconX stroke={1.75} aria-hidden className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
