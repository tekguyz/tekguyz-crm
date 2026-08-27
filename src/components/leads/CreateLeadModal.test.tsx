import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// The Server Action is never invoked here — it is mocked only so the
// "use server" module never loads in jsdom.
vi.mock("@/lib/leads/actions", () => ({
  createLead: vi.fn(),
}));

const { CreateLeadModal } = await import("./CreateLeadModal");

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "New Lead" }));
}

describe("CreateLeadModal — surviving a failed submit", () => {
  // Regression (2026-08-26). React 19 RESETS a <form action={...}> after the
  // action returns, failure included — it calls form.reset() on the element.
  // With uncontrolled inputs that wipes everything the user typed at exactly
  // the moment the error message is telling them to fix one field. A real
  // trigger here is the unique_tenant_client_email_ci collision, which returns
  // { error } and leaves the modal open.
  //
  // form.reset() is the exact DOM call React makes, so this reproduces the bug
  // faithfully in jsdom rather than asserting a proxy for it.
  it("keeps every typed value when the form is reset after a failed action", async () => {
    const user = userEvent.setup();
    const { container } = render(<CreateLeadModal />);
    await openForm(user);

    await user.type(screen.getByPlaceholderText("Client name"), "Dana Rivers");
    await user.type(screen.getByPlaceholderText("Email"), "dana@example.invalid");
    await user.type(screen.getByPlaceholderText("Phone"), "8175550101");
    await user.type(screen.getByPlaceholderText("Company"), "Rivers Roofing");
    await user.type(screen.getByPlaceholderText("Website"), "rivers.example");
    await user.type(screen.getByPlaceholderText("Lead source"), "Referral");
    await user.type(screen.getByPlaceholderText("Service category"), "Roofing");
    await user.type(screen.getByPlaceholderText("Estimated revenue"), "1200");

    // React 19's real sequence is form.reset() — and NOT necessarily a
    // re-render, since the component's props have not changed. Calling
    // rerender() here would mask the bug this pins: a controlled <select> is
    // restored by neither, so the group has to re-assert itself. Proven in the
    // browser, where React's props read the new value while the DOM read the
    // old one.
    container.querySelector("form")!.reset();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Client name")).toHaveValue("Dana Rivers");
    });
    expect(screen.getByPlaceholderText("Email")).toHaveValue("dana@example.invalid");
    expect(screen.getByPlaceholderText("Phone")).toHaveValue("8175550101");
    expect(screen.getByPlaceholderText("Company")).toHaveValue("Rivers Roofing");
    expect(screen.getByPlaceholderText("Website")).toHaveValue("rivers.example");
    expect(screen.getByPlaceholderText("Lead source")).toHaveValue("Referral");
    expect(screen.getByPlaceholderText("Service category")).toHaveValue("Roofing");
    expect(screen.getByPlaceholderText("Estimated revenue")).toHaveValue(1200);
  });

  it("keeps typed values across a re-render", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CreateLeadModal />);
    await openForm(user);

    await user.type(screen.getByPlaceholderText("Client name"), "Dana Rivers");
    rerender(<CreateLeadModal />);

    expect(screen.getByPlaceholderText("Client name")).toHaveValue("Dana Rivers");
  });
});

describe("CreateLeadModal — field parity", () => {
  it("posts exactly the eight fields createLead reads", async () => {
    const user = userEvent.setup();
    const { container } = render(<CreateLeadModal />);
    await openForm(user);

    expect([...new FormData(container.querySelector("form")!).keys()].sort()).toEqual([
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
