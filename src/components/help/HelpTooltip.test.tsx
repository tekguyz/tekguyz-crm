import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/help/HelpContext", () => ({ useHelp: () => ({ openHelp: vi.fn() }) }));

const { HelpTooltip } = await import("./HelpTooltip");

describe("HelpTooltip", () => {
  it("keeps the 16px glyph but has a 24px hit area, 44px on a phone", () => {
    render(<HelpTooltip topicId="webhook" blurb="Signed posts." />);
    const trigger = screen.getByRole("button", { name: "What's this?" });
    expect(trigger).toHaveClass("size-4", "relative", "after:absolute", "after:-inset-1", "max-sm:after:-inset-3.5");
  });

  it("does not take Button's 44px phone height, so a label row stays one line", () => {
    render(<HelpTooltip topicId="webhook" blurb="Signed posts." />);
    const trigger = screen.getByRole("button", { name: "What's this?" });
    expect(trigger).toHaveClass("max-sm:min-h-0");
    expect(trigger).not.toHaveClass("max-sm:min-h-11");
  });
});
