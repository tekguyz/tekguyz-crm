import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/shell/ShellContext", () => ({ useShell: () => ({ openCommand: vi.fn() }) }));

const { CommandTrigger } = await import("./CommandTrigger");

describe("CommandTrigger", () => {
  it("shows Ctrl K off Apple", () => {
    render(<CommandTrigger shortcut="Ctrl K" />);
    expect(screen.getByRole("button", { name: "Search" })).toHaveTextContent("Ctrl K");
  });

  it("shows ⌘K on Apple", () => {
    render(<CommandTrigger shortcut="⌘K" />);
    expect(screen.getByRole("button", { name: "Search" })).toHaveTextContent("⌘K");
  });
});
