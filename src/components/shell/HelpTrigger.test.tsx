import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/help/HelpContext", () => ({ useHelp: () => ({ openHelp: vi.fn() }) }));

const { HelpTrigger } = await import("./HelpTrigger");

describe("HelpTrigger", () => {
  it("is 44px square on a phone", () => {
    render(<HelpTrigger />);
    expect(screen.getByRole("button", { name: "Help" })).toHaveClass("max-sm:size-11");
  });
});
