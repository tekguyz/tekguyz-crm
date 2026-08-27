import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/organizations/actions", () => ({
  updateOrgSettings: vi.fn(),
  rotateWebhookSecret: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const { OrgDetailsPanel } = await import("./OrgDetailsPanel");

const props = {
  orgName: "TEKGUYZ",
  orgTimezone: "UTC",
  currencyFormat: "USD",
  webhookUrl: null,
  signingSecret: null,
  canEdit: true,
};

describe("OrgDetailsPanel — surviving a failed submit", () => {
  // Regression (2026-08-26). React 19 calls form.reset() after the action
  // returns, failure included — e.g. an empty-name rejection from
  // updateOrgSettings. Uncontrolled fields reverted to the stored org values,
  // discarding the edit the error was asking the user to correct.
  it("keeps the edited name, timezone and currency when the form is reset", async () => {
    const user = userEvent.setup();
    const { container } = render(<OrgDetailsPanel {...props} />);

    await user.clear(screen.getByLabelText("Organization name"));
    await user.type(screen.getByLabelText("Organization name"), "TEKGUYZ Renamed");
    await user.selectOptions(screen.getByLabelText("Currency"), "EUR");

    // React 19's real sequence is form.reset() — and NOT necessarily a
    // re-render, since the component's props have not changed. Calling
    // rerender() here would mask the bug this pins: a controlled <select> is
    // restored by neither, so the group has to re-assert itself. Proven in the
    // browser, where React's props read the new value while the DOM read the
    // old one.
    container.querySelector("form")!.reset();

    await waitFor(() => {
      expect(screen.getByLabelText("Currency")).toHaveValue("EUR");
    });
    expect(screen.getByLabelText("Organization name")).toHaveValue("TEKGUYZ Renamed");
  });

  it("keeps the edited name across a re-render", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<OrgDetailsPanel {...props} />);

    await user.clear(screen.getByLabelText("Organization name"));
    await user.type(screen.getByLabelText("Organization name"), "TEKGUYZ Renamed");
    rerender(<OrgDetailsPanel {...props} />);

    expect(screen.getByLabelText("Organization name")).toHaveValue("TEKGUYZ Renamed");
  });

  it("prefills from the org's stored settings", () => {
    render(<OrgDetailsPanel {...props} />);

    expect(screen.getByLabelText("Organization name")).toHaveValue("TEKGUYZ");
    expect(screen.getByLabelText("Timezone")).toHaveValue("UTC");
    expect(screen.getByLabelText("Currency")).toHaveValue("USD");
  });

  it("posts exactly the three fields updateOrgSettings reads", () => {
    const { container } = render(<OrgDetailsPanel {...props} />);

    expect([...new FormData(container.querySelector("form")!).keys()].sort()).toEqual([
      "currency_format",
      "name",
      "timezone",
    ]);
  });

  it("renders no form at all for a MEMBER", () => {
    const { container } = render(<OrgDetailsPanel {...props} canEdit={false} />);
    expect(container.querySelector("form")).toBeNull();
  });
});
