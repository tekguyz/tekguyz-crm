import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tasks/actions", () => ({ dismissTask: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { TaskDismissButton } = await import("./TaskDismissButton");

describe("TaskDismissButton", () => {
  it("is 44px square on a phone", () => {
    render(<TaskDismissButton taskId="t1" title="Call back" />);
    expect(screen.getByRole("button", { name: "Dismiss Call back" })).toHaveClass("max-sm:size-11");
  });
});
