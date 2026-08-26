import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Prospect } from "@/lib/prospects/queries";
import { PROMOTE_FIELD_NAMES } from "@/lib/prospects/promote-payload";
import { PromoteProspectModal } from "./PromoteProspectModal";

// The Server Action is never invoked here — it is mocked only so the
// "use server" module (and its next/cache import) never loads in jsdom.
vi.mock("@/lib/actions/prospect-promote-actions", () => ({
  promoteProspect: vi.fn(),
}));

const prospect = {
  id: "00000000-0000-0000-0000-0000000000aa",
  name: "Fake Falls Plumbing",
  category: "Plumber",
  address: "101 Invented Way",
  city: "Fort Worth",
  state: "TX",
  postal_code: "76102",
  phone: "(817) 555-0101",
  website_url: null,
  notes: "Gatekeeper. Try after 4pm.",
  status: "CALLED",
  promoted_lead_id: null,
  possible_duplicate_lead_id: null,
  archived: false,
} as unknown as Prospect;

function renderedFieldNames(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>("[name]")].map(
    (element) => element.getAttribute("name") as string,
  );
}

describe("PromoteProspectModal — form/action field parity", () => {
  // The half a source-level diff cannot do: what the FORM actually renders.
  // Together with promote-payload.test.ts (which diffs the action's
  // formData.get() calls against the same constant), this closes the loop in
  // both directions — a field read but never rendered stores NULL silently on
  // every save, and a field rendered but never read is typed in and thrown away.
  it("renders exactly the declared field set, no more and no less", () => {
    const { container } = render(
      <PromoteProspectModal prospect={prospect} onClose={() => {}} />,
    );

    const rendered = renderedFieldNames(container);

    expect([...rendered].sort()).toEqual([...PROMOTE_FIELD_NAMES].sort());
  });

  it("renders each field exactly once, so no value can shadow another", () => {
    const { container } = render(
      <PromoteProspectModal prospect={prospect} onClose={() => {}} />,
    );

    const rendered = renderedFieldNames(container);
    expect(rendered).toHaveLength(new Set(rendered).size);
  });
});

describe("PromoteProspectModal — prefill", () => {
  it("carries the prospect's known values into the form", () => {
    render(<PromoteProspectModal prospect={prospect} onClose={() => {}} />);

    expect(screen.getByLabelText("Contact name")).toHaveValue("Fake Falls Plumbing");
    expect(screen.getByLabelText("Company")).toHaveValue("Fake Falls Plumbing");
    expect(screen.getByLabelText("Phone")).toHaveValue("(817) 555-0101");
    expect(screen.getByLabelText("Address")).toHaveValue("101 Invented Way, Fort Worth, TX 76102");
    expect(screen.getByLabelText("Service category")).toHaveValue("Plumber");
    expect(screen.getByLabelText("Call notes")).toHaveValue("Gatekeeper. Try after 4pm.");
  });

  it("leaves email empty and required — it is the one thing a prospect cannot supply", () => {
    render(<PromoteProspectModal prospect={prospect} onClose={() => {}} />);

    const email = screen.getByLabelText("Email");
    expect(email).toHaveValue("");
    expect(email).toBeRequired();
  });

  it("carries the prospect id as a hidden field", () => {
    const { container } = render(
      <PromoteProspectModal prospect={prospect} onClose={() => {}} />,
    );

    const hidden = container.querySelector('input[name="prospect_id"]');
    expect(hidden).toHaveValue(prospect.id);
  });
});

describe("PromoteProspectModal — surviving a failed submit", () => {
  // Regression, found in the browser on 2026-08-26. React 19 RESETS a
  // <form action={...}> after the action returns, failure included. With
  // uncontrolled inputs that wiped the email the operator had just typed and
  // reverted every corrected field to its prefill — at exactly the moment the
  // error message was telling them to change something.
  //
  // A controlled field survives a re-render by construction, which is what this
  // pins. The reset itself needs a real server action and cannot be reproduced
  // in jsdom, so the test asserts the property that makes the reset harmless.
  it("keeps typed values across a re-render", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PromoteProspectModal prospect={prospect} onClose={() => {}} />,
    );

    await user.type(screen.getByLabelText("Email"), "dana@example.invalid");
    await user.clear(screen.getByLabelText("Contact name"));
    await user.type(screen.getByLabelText("Contact name"), "Dana Rivers");

    rerender(<PromoteProspectModal prospect={prospect} onClose={() => {}} />);

    expect(screen.getByLabelText("Email")).toHaveValue("dana@example.invalid");
    expect(screen.getByLabelText("Contact name")).toHaveValue("Dana Rivers");
  });

  it("renders every field as controlled, so none can be reset behind React's back", () => {
    const { container } = render(
      <PromoteProspectModal prospect={prospect} onClose={() => {}} />,
    );

    // A React-controlled input carries no defaultValue attribute in the DOM.
    // An uncontrolled one rendered from defaultValue does.
    const withDefault = [...container.querySelectorAll("[name]")].filter((element) =>
      element.hasAttribute("defaultValue"),
    );
    expect(withDefault).toEqual([]);
  });
});
