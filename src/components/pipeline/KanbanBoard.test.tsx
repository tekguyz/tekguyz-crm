import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Lead } from "@/lib/leads/queries";

const updateLeadStatus = vi.fn(async (..._args: unknown[]) => {});
const toastError = vi.fn();

// "use server" modules cannot load in jsdom, so the actions are mocked at their
// boundary. The card's drawer and the owner label are other surfaces with their
// own suites.
vi.mock("@/lib/leads/actions", () => ({
  updateLeadStatus: (...args: unknown[]) => updateLeadStatus(...args),
  createLead: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));
vi.mock("@/components/leads/EditLeadDrawer", () => ({ EditLeadDrawer: () => null }));
vi.mock("@/components/leads/AssigneeLabel", () => ({ AssigneeLabel: () => null }));

const { KanbanBoard } = await import("./KanbanBoard");

const lead = (id: string, name: string, status: string, company: string | null): Lead =>
  ({
    id,
    client_name: name,
    company,
    status,
    estimated_revenue: 1000,
    next_action_at: "2099-01-01T15:00:00.000Z",
    is_starred: false,
    assigned_to: null,
  }) as unknown as Lead;

const leads = [
  lead("l1", "Dana Rivers", "NEW", "Rivers Roofing"),
  lead("l2", "Omar Haddad", "QUOTED", null),
];

function renderBoard() {
  return render(<KanbanBoard leads={leads} orgTimezone="UTC" currencyFormat="USD" />);
}

describe("KanbanBoard — lanes", () => {
  beforeEach(() => {
    updateLeadStatus.mockReset();
    updateLeadStatus.mockResolvedValue(undefined);
    toastError.mockClear();
  });

  it("puts a '+ New' at the foot of every lane", () => {
    renderBoard();

    for (const stage of ["New", "Discovery", "Quoted", "Active"]) {
      expect(screen.getByRole("button", { name: `New lead in ${stage}` })).toBeInTheDocument();
    }
  });

  it("opens the create drawer on the lane's own stage", async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(screen.getByRole("button", { name: "New lead in Quoted" }));

    const stage = await screen.findByLabelText("Stage");
    expect(stage).toHaveValue("QUOTED");
    expect(new FormData(document.querySelector("form")!).get("status")).toBe("QUOTED");
  });

  it("shows the company on its own line and drops the line when there is none", () => {
    renderBoard();

    const withCompany = screen.getByText("Dana Rivers").closest('[role="button"]') as HTMLElement;
    const without = screen.getByText("Omar Haddad").closest('[role="button"]') as HTMLElement;
    expect(within(withCompany).getByText("Rivers Roofing")).toBeInTheDocument();
    expect(withCompany.querySelector(".tabler-icon-building")).not.toBeNull();
    expect(without.querySelector(".tabler-icon-building")).toBeNull();
  });

  it("says so when a drop could not be saved, and puts the card back", async () => {
    updateLeadStatus.mockRejectedValue(new Error("nope"));
    renderBoard();

    const discovery = screen.getByRole("heading", { name: "Discovery" }).closest("section")!;
    fireEvent.drop(discovery, { dataTransfer: { getData: () => "l1" } });

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastError.mock.calls[0][0]).toBe(
      "Couldn't move Dana Rivers to Discovery. It is back in New.",
    );
    const newLane = screen.getByRole("heading", { name: "New" }).closest("section")!;
    expect(within(newLane).getByText("Dana Rivers")).toBeInTheDocument();
  });

  it("does not complain when a drop is saved", async () => {
    renderBoard();

    const discovery = screen.getByRole("heading", { name: "Discovery" }).closest("section")!;
    fireEvent.drop(discovery, { dataTransfer: { getData: () => "l1" } });

    await waitFor(() => expect(updateLeadStatus).toHaveBeenCalledWith("l1", "DISCOVERY"));
    expect(toastError).not.toHaveBeenCalled();
  });
});
