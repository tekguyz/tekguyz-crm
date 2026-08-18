import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Lead } from "@/lib/leads/queries";
import { OutcomeFields } from "./OutcomeFields";

const lead = {
  id: "00000000-0000-0000-0000-000000000001",
  client_name: "Ben Whitaker",
  email: "ben@example.com",
  estimated_revenue: 4200,
  status: "QUOTED",
  outcome: "WON",
  actual_revenue: 3900,
  next_action_at: "2026-09-01T15:00:00.000Z",
  is_starred: false,
  archived: false,
} as unknown as Lead;

describe("OutcomeFields — role gating", () => {
  it.each(["OWNER", "ADMIN"])("renders both controls for %s", (role) => {
    render(<OutcomeFields lead={lead} role={role} />);

    expect(screen.getByLabelText("Outcome")).toBeInTheDocument();
    expect(screen.getByLabelText("Actual revenue (if closed)")).toBeInTheDocument();
  });

  it("renders neither control for a MEMBER", () => {
    render(<OutcomeFields lead={lead} role="MEMBER" />);

    expect(screen.queryByLabelText("Outcome")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Actual revenue (if closed)")).not.toBeInTheDocument();
  });

  // Form/Action Field Parity. updateLead always writes outcome, actual_revenue
  // and closed_at from FormData, so hiding the visible inputs without these two
  // hidden ones would post null for all three and get the whole save rejected
  // by the role trigger — on an edit a MEMBER is otherwise allowed to make.
  it("still posts the current outcome and revenue for a MEMBER", () => {
    const { container } = render(<OutcomeFields lead={lead} role="MEMBER" />);

    const outcome = container.querySelector('input[name="outcome"]');
    const revenue = container.querySelector('input[name="actual_revenue"]');

    expect(outcome).toHaveAttribute("type", "hidden");
    expect(outcome).toHaveValue("WON");
    expect(revenue).toHaveAttribute("type", "hidden");
    expect(revenue).toHaveValue("3900");
  });
});
