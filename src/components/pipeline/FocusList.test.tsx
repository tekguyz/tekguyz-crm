import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Lead } from "@/lib/leads/queries";

vi.mock("@/lib/leads/actions", () => ({ updateLeadStatus: vi.fn(), createLead: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/components/leads/EditLeadDrawer", () => ({ EditLeadDrawer: () => null }));
vi.mock("@/components/leads/CreateLeadDrawer", () => ({ CreateLeadSheet: () => null }));
vi.mock("@/components/leads/AssigneeLabel", () => ({ AssigneeLabel: () => null }));

const { FocusList } = await import("./FocusList");

const leads = [
  {
    id: "l1",
    client_name: "Dana Rivers",
    company: null,
    status: "NEW",
    estimated_revenue: 1000,
    next_action_at: "2099-01-01T15:00:00.000Z",
    is_starred: false,
    assigned_to: null,
  },
] as unknown as Lead[];

describe("FocusList", () => {
  it("shows only '+ New' in an empty stage, no 'No leads' line", () => {
    render(<FocusList leads={leads} orgTimezone="UTC" currencyFormat="USD" />);
    expect(screen.queryByText("No leads")).toBeNull();
    expect(screen.getByRole("button", { name: "New lead in Discovery" })).toBeInTheDocument();
  });
});
