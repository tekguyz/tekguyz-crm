import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toggleTaskComplete = vi.fn(async () => {});
const fetchTasksForLead = vi.fn(async () => ({
  tasks: [
    {
      id: "task-1",
      lead_id: "lead-1",
      title: "Send the quote",
      description: null,
      due_at: "2026-09-01T15:00:00.000Z",
      completed: false,
      completed_at: null,
      dismissed: false,
      created_at: "2026-08-19T09:00:00.000Z",
    },
  ],
  timeZone: "UTC",
}));

// "use server" modules cannot be imported into jsdom, so the action module is
// mocked at its boundary. Everything under test here is client-side.
vi.mock("@/lib/tasks/actions", () => ({
  createTask: Object.assign(vi.fn(), { bind: () => vi.fn() }),
  // TaskRow, rendered per row by this section, binds updateTask and calls
  // dismissTask — both have to exist on the mocked boundary or the row throws.
  updateTask: Object.assign(vi.fn(), { bind: () => vi.fn(async () => null) }),
  dismissTask: vi.fn(async () => {}),
  fetchTasksForLead: (...args: unknown[]) => fetchTasksForLead(...(args as [])),
  toggleTaskComplete: (...args: unknown[]) => toggleTaskComplete(...(args as [])),
}));

const { TasksSection } = await import("./TasksSection");

describe("TasksSection — per-task toggle", () => {
  beforeEach(() => {
    toggleTaskComplete.mockClear();
  });

  it("renders the toggle as the shared Checkbox primitive, not a raw input", async () => {
    render(<TasksSection leadId="lead-1" />);
    const box = await screen.findByRole("checkbox", { name: "Complete Send the quote" });
    expect(box).toHaveAttribute("data-slot", "checkbox");
    expect(box.className).not.toMatch(/accent-accent/);
  });

  // This toggle is NOT a form field: it has no `name`, sits outside the
  // <form>, and calls toggleTaskComplete directly. So the field-parity risk
  // that applies to PipelineFields' is_starred does not apply here — what has
  // to survive the swap is the callback and the accessible name, and that is
  // what this asserts.
  it("calls toggleTaskComplete with the inverted state on click", async () => {
    const user = userEvent.setup();
    render(<TasksSection leadId="lead-1" />);
    const box = await screen.findByRole("checkbox", { name: "Complete Send the quote" });
    await user.click(box);
    await waitFor(() => expect(toggleTaskComplete).toHaveBeenCalledWith("task-1", true));
  });

  it("contributes no name to the enclosing form", async () => {
    const { container } = render(<TasksSection leadId="lead-1" />);
    await screen.findByRole("checkbox", { name: "Complete Send the quote" });
    // The section's own create form is the first in the DOM; TaskRow only
    // renders a form once a row is switched into edit mode.
    const form = container.querySelector("form")!;
    // due_at's hidden ISO carrier is the only thing this form posts besides
    // the title field.
    expect([...new FormData(form).keys()].sort()).toEqual(["due_at", "title"]);
  });
});
