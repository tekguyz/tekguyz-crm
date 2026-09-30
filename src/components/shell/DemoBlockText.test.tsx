import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEMO_BLOCK_MESSAGE } from "@/lib/demo/demo-block-message";

import { DemoBlockText } from "./DemoBlockText";

describe("DemoBlockText", () => {
  it("turns the Demo Block message into text plus the contact link", () => {
    render(<p><DemoBlockText message={DEMO_BLOCK_MESSAGE} /></p>);
    expect(screen.getByText(/Not available in the demo\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Talk to TEKGUYZ →" })).toHaveAttribute(
      "href",
      "https://tekguyz.com/contact",
    );
  });

  it("leaves any other message as plain text", () => {
    render(<p><DemoBlockText message="Invalid role." /></p>);
    expect(screen.getByText("Invalid role.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
