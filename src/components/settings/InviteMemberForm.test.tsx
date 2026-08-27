import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/invites/actions", () => ({
  createInvite: vi.fn(),
}));

const { InviteMemberForm } = await import("./InviteMemberForm");

describe("InviteMemberForm — surviving a failed submit", () => {
  // Regression (2026-08-26). React 19 calls form.reset() after the action
  // returns, failure included. A real trigger here is the `Invalid role.`
  // rejection, which returns { error } without navigating — so the typed email
  // was wiped while the error message asked the user to change something.
  it("keeps the typed email and the chosen role when the form is reset", async () => {
    const user = userEvent.setup();
    const { container } = render(<InviteMemberForm />);

    await user.type(screen.getByLabelText("Email"), "dana@example.invalid");
    await user.selectOptions(screen.getByLabelText("Role"), "ADMIN");

    // React 19's real sequence is form.reset() — and NOT necessarily a
    // re-render, since the component's props have not changed. Calling
    // rerender() here would mask the bug this pins: a controlled <select> is
    // restored by neither, so the group has to re-assert itself. Proven in the
    // browser, where React's props read the new value while the DOM read the
    // old one.
    container.querySelector("form")!.reset();

    await waitFor(() => {
      expect(screen.getByLabelText("Role")).toHaveValue("ADMIN");
    });
    expect(screen.getByLabelText("Email")).toHaveValue("dana@example.invalid");
  });

  it("keeps typed values across a re-render", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<InviteMemberForm />);

    await user.type(screen.getByLabelText("Email"), "dana@example.invalid");
    rerender(<InviteMemberForm />);

    expect(screen.getByLabelText("Email")).toHaveValue("dana@example.invalid");
  });

  it("posts exactly the two fields createInvite reads", () => {
    const { container } = render(<InviteMemberForm />);

    expect([...new FormData(container.querySelector("form")!).keys()].sort()).toEqual([
      "email",
      "role",
    ]);
  });

  it("still defaults the role to MEMBER", () => {
    render(<InviteMemberForm />);
    expect(screen.getByLabelText("Role")).toHaveValue("MEMBER");
  });
});
