import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Task } from "@/lib/tasks/queries";

const dismissTask = vi.fn(async () => {});
const toggleTaskComplete = vi.fn(async () => {});

// "use server" modules cannot be imported into jsdom, so the action module is
// mocked at its boundary. updateTask needs a real .bind because TaskRow binds
// the task id onto it before handing it to useActionState.
vi.mock("@/lib/tasks/actions", () => ({
  updateTask: Object.assign(vi.fn(), { bind: () => vi.fn(async () => null) }),
  dismissTask: (...args: unknown[]) => dismissTask(...(args as [])),
  toggleTaskComplete: (...args: unknown[]) => toggleTaskComplete(...(args as [])),
}));

const { TaskRow, toDatetimeLocalValue } = await import("./TaskRow");

const task: Task = {
  id: "task-1",
  lead_id: "lead-1",
  title: "Send the quote",
  description: "Include the second option",
  due_at: "2026-09-01T15:00:00.000Z",
  completed: false,
  completed_at: null,
  dismissed: false,
  created_at: "2026-08-19T09:00:00.000Z",
};

describe("TaskRow", () => {
  beforeEach(() => {
    dismissTask.mockClear();
  });

  it("posts exactly the three fields updateTask reads (field parity)", async () => {
    const user = userEvent.setup();
    const { container } = render(<TaskRow task={task} timeZone="UTC" onChanged={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Edit Send the quote" }));

    const form = container.querySelector("form")!;
    expect([...new FormData(form).keys()].sort()).toEqual(["description", "due_at", "title"]);
  });

  it("prefills the edit form from the task's current values", async () => {
    const user = userEvent.setup();
    render(<TaskRow task={task} timeZone="UTC" onChanged={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Edit Send the quote" }));

    expect(screen.getByLabelText("Task title")).toHaveValue("Send the quote");
    expect(screen.getByLabelText("Task description")).toHaveValue("Include the second option");
  });

  it("calls dismissTask — never a delete — from the dismiss control", async () => {
    const user = userEvent.setup();
    render(<TaskRow task={task} timeZone="UTC" onChanged={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Dismiss Send the quote" }));

    await waitFor(() => expect(dismissTask).toHaveBeenCalledWith("task-1"));
  });

  it("keeps both controls in the DOM without hover, so they are keyboard-reachable", () => {
    render(<TaskRow task={task} timeZone="UTC" onChanged={() => {}} />);

    expect(screen.getByRole("button", { name: "Edit Send the quote" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Dismiss Send the quote" })).toBeVisible();
  });
});

describe("toDatetimeLocalValue", () => {
  it("renders the instant in local wall-clock time, not UTC", () => {
    const iso = "2026-09-01T15:00:00.000Z";
    const local = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");

    expect(toDatetimeLocalValue(iso)).toBe(
      `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}` +
        `T${pad(local.getHours())}:${pad(local.getMinutes())}`,
    );
  });

  it("returns an empty string for an unparseable value rather than 'Invalid Date'", () => {
    expect(toDatetimeLocalValue("not-a-date")).toBe("");
  });
});
