import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/account/actions", () => ({
  updateDisplayName: vi.fn(),
  updateNotificationPreferences: vi.fn(),
}));

const { AccountPanel } = await import("./AccountPanel");

const props = {
  userEmail: "owner@example.invalid",
  displayName: "Dana",
  notifyNewLead: true,
  notifyWeeklyReport: false,
};

function nameForm(container: HTMLElement) {
  return container.querySelectorAll("form")[0];
}
function prefsForm(container: HTMLElement) {
  return container.querySelectorAll("form")[1];
}

describe("AccountPanel — surviving a failed submit", () => {
  // Regression (2026-08-26). React 19 calls form.reset() after the action
  // returns, failure included — e.g. a too-long display name rejected by
  // updateDisplayName. The typed name was wiped back to the stored value.
  it("keeps the typed display name when its form is reset", async () => {
    const user = userEvent.setup();
    const { container } = render(<AccountPanel {...props} />);

    await user.clear(screen.getByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "Dana Rivers");

    // React 19's real sequence is form.reset() — and NOT necessarily a
    // re-render, since the component's props have not changed. Calling
    // rerender() here would mask the bug this pins: a controlled <select> is
    // restored by neither, so the group has to re-assert itself. Proven in the
    // browser, where React's props read the new value while the DOM read the
    // old one.
    nameForm(container).reset();

    await waitFor(() => {
      expect(screen.getByLabelText("Display name")).toHaveValue("Dana Rivers");
    });
  });

  it("keeps the toggled notification preferences when its form is reset", async () => {
    const user = userEvent.setup();
    const { container } = render(<AccountPanel {...props} />);

    await user.click(screen.getByLabelText("New lead alerts"));
    await user.click(screen.getByLabelText("Weekly revenue report"));

    // Radix restores its own mount-time value on a form reset, so the panel
    // re-applies the user's choice in a microtask — awaited here rather than
    // asserted synchronously, which is also how the real post-action sequence
    // plays out.
    prefsForm(container).reset();

    await waitFor(() => {
      expect(screen.getByLabelText("New lead alerts")).toHaveAttribute(
        "data-state",
        "unchecked",
      );
    });
    expect(screen.getByLabelText("Weekly revenue report")).toHaveAttribute(
      "data-state",
      "checked",
    );
  });

  it("keeps the typed display name across a re-render", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AccountPanel {...props} />);

    await user.clear(screen.getByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "Dana Rivers");
    rerender(<AccountPanel {...props} />);

    expect(screen.getByLabelText("Display name")).toHaveValue("Dana Rivers");
  });

  it("prefills from the account's stored values", () => {
    render(<AccountPanel {...props} />);

    expect(screen.getByLabelText("Display name")).toHaveValue("Dana");
    expect(screen.getByLabelText("New lead alerts")).toHaveAttribute("data-state", "checked");
    expect(screen.getByLabelText("Weekly revenue report")).toHaveAttribute(
      "data-state",
      "unchecked",
    );
  });

  it("posts exactly the fields each action reads", () => {
    const { container } = render(<AccountPanel {...props} />);

    expect([...new FormData(nameForm(container)).keys()]).toEqual(["display_name"]);
    // Only the checked box submits a value, exactly as a native checkbox does —
    // updateNotificationPreferences reads `=== "on"`, so absence means false.
    expect([...new FormData(prefsForm(container)).keys()]).toEqual(["notify_new_lead"]);
  });
});
