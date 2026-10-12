import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WebhookPayload } from "./WebhookPayload";

const content = JSON.stringify({ client_name: "Dana Rivers", email: "dana@example.invalid" });

describe("WebhookPayload", () => {
  it("says what happened and keeps the raw JSON closed until asked", () => {
    render(<WebhookPayload content={content} />);

    expect(screen.getByText("Enquiry received through the webhook.")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Show payload" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(/dana@example.invalid/)).not.toBeVisible();
  });

  it("shows the payload pretty-printed, then hides it again", async () => {
    const user = userEvent.setup();
    render(<WebhookPayload content={content} />);

    await user.click(screen.getByRole("button", { name: "Show payload" }));

    const toggle = screen.getByRole("button", { name: "Hide payload" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/"client_name": "Dana Rivers"/)).toBeVisible();

    await user.click(toggle);
    expect(screen.getByText(/dana@example.invalid/)).not.toBeVisible();
  });

  it("shows content that is not JSON as stored, rather than dropping it", async () => {
    const user = userEvent.setup();
    render(<WebhookPayload content="not json {" />);

    await user.click(screen.getByRole("button", { name: "Show payload" }));

    expect(screen.getByText("not json {")).toBeVisible();
  });
});
