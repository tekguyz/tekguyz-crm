import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Lead } from "@/lib/leads/queries";

vi.mock("@/lib/leads/actions", () => ({
  updateLead: Object.assign(vi.fn(), { bind: () => vi.fn(async () => null) }),
}));
// The archive path and the profile sheet are separate surfaces with their own
// suites; stubbed so this one stays about the edit form.
vi.mock("@/components/leads/profile/ProfileSheet", () => ({ ProfileSheet: () => null }));
vi.mock("@/components/leads/edit-modal/ArchiveControls", () => ({ ArchiveControls: () => null }));
vi.mock("@/components/shell/RoleContext", () => ({ useOrgRole: () => "OWNER" }));
vi.mock("@/components/shell/MembersContext", () => ({
  useOrgMembers: () => [{ user_id: "user-1", display_name: "Dana Rivers", email: "d@x.invalid" }],
  memberLabel: (m: { display_name: string }) => m.display_name,
}));

const { EditLeadModal } = await import("./EditLeadModal");

const lead = {
  id: "00000000-0000-0000-0000-0000000000bb",
  client_name: "Fake Falls Plumbing",
  email: "hello@fakefalls.invalid",
  phone: "(817) 555-0101",
  company: "Fake Falls Plumbing LLC",
  website: "fakefalls.invalid",
  lead_source: "Webhook",
  service_category: "Plumber",
  physical_address: "101 Invented Way",
  social_google_business: "",
  social_facebook: "",
  social_instagram: "",
  status: "NEW",
  estimated_revenue: 1000,
  next_action_at: "2026-09-01T15:00:00.000Z",
  is_starred: false,
  assigned_to: null,
  outcome: null,
  actual_revenue: null,
} as unknown as Lead;

function renderModal() {
  return render(<EditLeadModal lead={lead} open onClose={() => {}} />);
}

describe("EditLeadModal — surviving a failed submit across every sibling", () => {
  // Regression (2026-08-26). This form is SPLIT ACROSS FIVE sibling files, so
  // no single file shows its field set — the exact shape CLAUDE.md's
  // Form/Action Field Parity rule warns about. React 19 resets a
  // <form action={...}> after the action returns, failure included, and the
  // reset does not respect file boundaries: fixing one sibling leaves the same
  // data loss in the other four. This asserts the whole form at once, which is
  // the only level at which the property is真 meaningful.
  it("keeps every edited value in every field group when the form is reset", async () => {
    const user = userEvent.setup();
    const { container } = renderModal();

    await user.clear(screen.getByLabelText("Client name"));
    await user.type(screen.getByLabelText("Client name"), "Dana Rivers");
    await user.clear(screen.getByLabelText("Physical address"));
    await user.type(screen.getByLabelText("Physical address"), "202 Corrected Road");
    await user.type(screen.getByLabelText("Facebook URL"), "facebook.example/dana");
    await user.selectOptions(screen.getByLabelText("Status"), "QUOTED");
    await user.clear(screen.getByLabelText("Estimated revenue"));
    await user.type(screen.getByLabelText("Estimated revenue"), "2500");
    await user.click(screen.getByLabelText("Starred"));
    await user.selectOptions(screen.getByLabelText("Assigned to"), "user-1");
    await user.selectOptions(screen.getByLabelText("Outcome"), "WON");
    await user.type(screen.getByLabelText("Actual revenue (if closed)"), "2400");

    // React 19's real sequence is form.reset() — and NOT necessarily a
    // re-render, since the component's props have not changed. Calling
    // rerender() here would mask the bug this pins: a controlled <select> is
    // restored by neither, so the group has to re-assert itself. Proven in the
    // browser, where React's props read the new value while the DOM read the
    // old one.
    container.querySelector("form")!.reset();

    await waitFor(() => {
      expect(screen.getByLabelText("Outcome")).toHaveValue("WON");
    });
    expect(screen.getByLabelText("Client name")).toHaveValue("Dana Rivers");
    expect(screen.getByLabelText("Physical address")).toHaveValue("202 Corrected Road");
    expect(screen.getByLabelText("Facebook URL")).toHaveValue("facebook.example/dana");
    expect(screen.getByLabelText("Status")).toHaveValue("QUOTED");
    expect(screen.getByLabelText("Estimated revenue")).toHaveValue(2500);
    expect(screen.getByLabelText("Assigned to")).toHaveValue("user-1");
    expect(screen.getByLabelText("Actual revenue (if closed)")).toHaveValue(2400);
    await waitFor(() => {
      expect(screen.getByLabelText("Starred")).toHaveAttribute("data-state", "checked");
    });
  });

  it("prefills every group from the lead's stored values", () => {
    renderModal();

    expect(screen.getByLabelText("Client name")).toHaveValue("Fake Falls Plumbing");
    expect(screen.getByLabelText("Physical address")).toHaveValue("101 Invented Way");
    expect(screen.getByLabelText("Status")).toHaveValue("NEW");
    expect(screen.getByLabelText("Estimated revenue")).toHaveValue(1000);
    expect(screen.getByLabelText("Assigned to")).toHaveValue("");
    expect(screen.getByLabelText("Outcome")).toHaveValue("");
    expect(screen.getByLabelText("Starred")).toHaveAttribute("data-state", "unchecked");
  });

  it("posts exactly the columns updateLead writes (field parity across all five files)", () => {
    const { container } = renderModal();

    expect([...new FormData(container.querySelector("form")!).keys()].sort()).toEqual([
      "actual_revenue",
      "assigned_to",
      "client_name",
      "company",
      "email",
      "estimated_revenue",
      "lead_source",
      "next_action_at",
      "outcome",
      "phone",
      "physical_address",
      "service_category",
      "social_facebook",
      "social_google_business",
      "social_instagram",
      "status",
      "website",
    ]);
  });
});
