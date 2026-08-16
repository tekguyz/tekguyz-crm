import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Lead } from "@/lib/leads/queries";
import { PipelineFields } from "./PipelineFields";

// Only the four fields PipelineFields actually reads are meaningful here; the
// rest of Lead is filled in so the type is satisfied without pretending this
// fixture stands for a real row.
const lead = {
  id: "00000000-0000-0000-0000-000000000001",
  client_name: "Ben Whitaker",
  company: null,
  email: "ben@example.com",
  phone: null,
  website: null,
  physical_address: null,
  social_google_business: null,
  social_facebook: null,
  social_instagram: null,
  lead_source: null,
  service_category: null,
  estimated_revenue: 4200,
  status: "QUOTED",
  outcome: null,
  actual_revenue: null,
  next_action_at: "2026-09-01T15:00:00.000Z",
  is_starred: true,
  ai_brief: null,
  archived: false,
} as unknown as Lead;

describe("PipelineFields — Starred checkbox", () => {
  // Form/Action Field Parity. updateLead reads
  // formData.get("is_starred") === "on". Swapping the native
  // <input type="checkbox"> for the Radix-based Checkbox moves that name onto a
  // hidden native input Radix keeps in the form — if it ever stops reaching the
  // form, leads.is_starred silently NULLs on every save with no error. This is
  // the assertion that catches that.
  it("carries is_starred into FormData when checked", () => {
    const { container } = render(
      <form>
        <PipelineFields lead={lead} />
      </form>,
    );
    const form = container.querySelector("form")!;
    expect(new FormData(form).get("is_starred")).toBe("on");
  });

  it("omits is_starred from FormData when unchecked", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <PipelineFields lead={lead} />
      </form>,
    );
    await user.click(screen.getByRole("checkbox", { name: "Starred" }));
    const form = container.querySelector("form")!;
    expect(new FormData(form).get("is_starred")).toBeNull();
  });

  it("renders the Starred control as the shared Checkbox primitive", () => {
    render(<PipelineFields lead={lead} />);
    const box = screen.getByRole("checkbox", { name: "Starred" });
    expect(box).toHaveAttribute("data-slot", "checkbox");
    expect(box.className).not.toMatch(/accent-accent/);
  });

  // The hidden ISO sibling is the only next_action_at in the FormData — the
  // visible datetime-local field is deliberately unnamed.
  it("still posts next_action_at from its hidden ISO sibling", () => {
    const { container } = render(
      <form>
        <PipelineFields lead={lead} />
      </form>,
    );
    const form = container.querySelector("form")!;
    expect(new FormData(form).get("next_action_at")).toBe(lead.next_action_at);
  });
});
