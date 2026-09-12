import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Lead } from "@/lib/leads/queries";
import { IdentityFields } from "./IdentityFields";

const lead = {
  id: "00000000-0000-0000-0000-0000000000bb",
  client_name: "Fake Falls Plumbing",
  email: "hello@fakefalls.invalid",
  phone: "(817) 555-0101",
  company: "Fake Falls Plumbing LLC",
  website: "fakefalls.invalid",
  lead_source: "Webhook",
  service_category: "Plumber",
} as unknown as Lead;

function renderInForm(current: Lead = lead) {
  return render(
    <form>
      <IdentityFields lead={current} />
    </form>,
  );
}

describe("IdentityFields — prefill", () => {
  it("carries the lead's current values into the form", () => {
    renderInForm();

    expect(screen.getByLabelText("Client name")).toHaveValue("Fake Falls Plumbing");
    expect(screen.getByLabelText("Email")).toHaveValue("hello@fakefalls.invalid");
    expect(screen.getByLabelText("Phone")).toHaveValue("(817) 555-0101");
    expect(screen.getByLabelText("Company")).toHaveValue("Fake Falls Plumbing LLC");
    expect(screen.getByLabelText("Website")).toHaveValue("fakefalls.invalid");
    expect(screen.getByLabelText("Lead source")).toHaveValue("Webhook");
    expect(screen.getByLabelText("Service category")).toHaveValue("Plumber");
  });

  it("renders a null column as an empty string, never the text 'null'", () => {
    renderInForm({ ...lead, phone: null, website: null } as unknown as Lead);

    expect(screen.getByLabelText("Phone")).toHaveValue("");
    expect(screen.getByLabelText("Website")).toHaveValue("");
  });
});

describe("IdentityFields — surviving a failed submit", () => {
  // Regression (2026-08-26). React 19 calls form.reset() after the action
  // returns, failure included. Uncontrolled fields reverted to the lead's
  // stored values, silently throwing away every correction the user had just
  // made — the worst shape of this bug, because the form then looks untouched.
  it("keeps every corrected value when the form is reset", async () => {
    const user = userEvent.setup();
    const { container } = renderInForm();

    await user.clear(screen.getByLabelText("Client name"));
    await user.type(screen.getByLabelText("Client name"), "Dana Rivers");
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "dana@example.invalid");
    await user.clear(screen.getByLabelText("Service category"));
    await user.type(screen.getByLabelText("Service category"), "Roofing");

    // React 19's real sequence is form.reset() — and NOT necessarily a
    // re-render, since the component's props have not changed. Calling
    // rerender() here would mask the bug this pins: a controlled <select> is
    // restored by neither, so the group has to re-assert itself. Proven in the
    // browser, where React's props read the new value while the DOM read the
    // old one.
    container.querySelector("form")!.reset();

    await waitFor(() => {
      expect(screen.getByLabelText("Client name")).toHaveValue("Dana Rivers");
    });
    expect(screen.getByLabelText("Email")).toHaveValue("dana@example.invalid");
    expect(screen.getByLabelText("Service category")).toHaveValue("Roofing");
  });

  it("keeps corrected values across a re-render", async () => {
    const user = userEvent.setup();
    const { rerender } = renderInForm();

    await user.clear(screen.getByLabelText("Client name"));
    await user.type(screen.getByLabelText("Client name"), "Dana Rivers");

    rerender(
      <form>
        <IdentityFields lead={lead} />
      </form>,
    );

    expect(screen.getByLabelText("Client name")).toHaveValue("Dana Rivers");
  });
});

describe("IdentityFields — field parity", () => {
  // updateLead() writes all seven unconditionally (`formData.get(x) || null`),
  // so a field that stops rendering silently NULLs a real column on every save.
  it("renders exactly the seven columns updateLead writes here", () => {
    const { container } = renderInForm();

    expect([...new FormData(container.querySelector("form")!).keys()].sort()).toEqual([
      "client_name",
      "company",
      "email",
      "lead_source",
      "phone",
      "service_category",
      "website",
    ]);
  });
});
