import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// The Server Action is never invoked here — it is mocked only so the
// "use server" module never loads in jsdom.
vi.mock("@/lib/leads/actions", () => ({
  createLead: vi.fn(),
}));

const { CreateLeadDrawer } = await import("./CreateLeadDrawer");

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "New Lead" }));
}

describe("CreateLeadDrawer — surviving a failed submit", () => {
  // Regression (2026-08-26). React 19 RESETS a <form action={...}> after the
  // action returns, failure included — it calls form.reset() on the element.
  // With uncontrolled inputs that wipes everything the user typed at exactly
  // the moment the error message is telling them to fix one field. A real
  // trigger here is the unique_tenant_client_email_ci collision, which returns
  // { error } and leaves the modal open.
  //
  // form.reset() is the exact DOM call React makes, so this reproduces the bug
  // faithfully in jsdom rather than asserting a proxy for it.
  //
  // The form is reached through `document`, not RTL's `container`: the drawer
  // is a Radix Sheet and its content is PORTALLED to document.body, so it is
  // not a descendant of the render container at all. A `container` lookup
  // returns null here and the test fails on a null deref rather than on the
  // property it is pinning.
  it("keeps every typed value when the form is reset after a failed action", async () => {
    const user = userEvent.setup();
    render(<CreateLeadDrawer />);
    await openForm(user);

    await user.type(screen.getByLabelText("Client name"), "Dana Rivers");
    await user.type(screen.getByLabelText("Email"), "dana@example.invalid");
    await user.type(screen.getByLabelText("Phone"), "8175550101");
    await user.type(screen.getByLabelText("Company"), "Rivers Roofing");
    await user.type(screen.getByLabelText("Website"), "rivers.example");
    await user.type(screen.getByLabelText("Lead source"), "Referral");
    await user.type(screen.getByLabelText("Service category"), "Roofing");
    await user.type(screen.getByLabelText("Estimated revenue"), "1200");

    // React 19's real sequence is form.reset() — and NOT necessarily a
    // re-render, since the component's props have not changed. Calling
    // rerender() here would mask the bug this pins: a controlled <select> is
    // restored by neither, so the group has to re-assert itself. Proven in the
    // browser, where React's props read the new value while the DOM read the
    // old one.
    document.querySelector("form")!.reset();

    await waitFor(() => {
      expect(screen.getByLabelText("Client name")).toHaveValue("Dana Rivers");
    });
    expect(screen.getByLabelText("Email")).toHaveValue("dana@example.invalid");
    expect(screen.getByLabelText("Phone")).toHaveValue("8175550101");
    expect(screen.getByLabelText("Company")).toHaveValue("Rivers Roofing");
    expect(screen.getByLabelText("Website")).toHaveValue("rivers.example");
    expect(screen.getByLabelText("Lead source")).toHaveValue("Referral");
    expect(screen.getByLabelText("Service category")).toHaveValue("Roofing");
    expect(screen.getByLabelText("Estimated revenue")).toHaveValue(1200);
  });

  // Note the placeholders became real <label>s when this form moved into the
  // drawer: Input owns its own label/htmlFor pair, and a placeholder is not a
  // label. The queries below assert the accessible name, which is the stronger
  // assertion anyway.
  it("keeps typed values across a re-render", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CreateLeadDrawer />);
    await openForm(user);

    await user.type(screen.getByLabelText("Client name"), "Dana Rivers");
    rerender(<CreateLeadDrawer />);

    expect(screen.getByLabelText("Client name")).toHaveValue("Dana Rivers");
  });
});

describe("CreateLeadDrawer — field parity", () => {
  it("posts exactly the eight fields createLead reads", async () => {
    const user = userEvent.setup();
    render(<CreateLeadDrawer />);
    await openForm(user);

    expect([...new FormData(document.querySelector("form")!).keys()].sort()).toEqual([
      "client_name",
      "company",
      "email",
      "estimated_revenue",
      "lead_source",
      "phone",
      "service_category",
      "website",
    ]);
  });
});
