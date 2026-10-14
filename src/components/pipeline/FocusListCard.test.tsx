import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Lead } from "@/lib/leads/queries";

vi.mock("@/components/leads/EditLeadDrawer", () => ({
  EditLeadDrawer: ({ open }: { open: boolean }) => (open ? <div data-testid="drawer" /> : null),
}));
vi.mock("@/components/leads/AssigneeLabel", () => ({ AssigneeLabel: () => null }));

const { FocusListCard } = await import("./FocusListCard");

const lead = {
  id: "l1",
  client_name: "Dana Rivers",
  company: "Rivers Roofing",
  status: "NEW",
  estimated_revenue: 1000,
  next_action_at: "2099-01-01T15:00:00.000Z",
  is_starred: false,
  assigned_to: null,
} as unknown as Lead;

function renderCard() {
  const onStatusChange = vi.fn();
  const view = render(
    <FocusListCard lead={lead} orgTimezone="UTC" currencyFormat="USD" onStatusChange={onStatusChange} />,
  );
  return { onStatusChange, ...view };
}

describe("FocusListCard", () => {
  it("is not one big button with a control inside it", () => {
    const { container } = renderCard();
    expect(container.querySelector('[role="button"]')).toBeNull();
  });

  it("opens the lead from its own button", async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: "Open Dana Rivers" }));
    expect(screen.getByTestId("drawer")).toBeInTheDocument();
  });

  it("does not open the lead when Enter or Space is pressed on the stage select", async () => {
    const user = userEvent.setup();
    renderCard();
    screen.getByRole("combobox", { name: "Status for Dana Rivers" }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(screen.queryByTestId("drawer")).toBeNull();
  });

  it("moves the lead when the stage select changes", async () => {
    const user = userEvent.setup();
    const { onStatusChange } = renderCard();
    await user.selectOptions(screen.getByRole("combobox", { name: "Status for Dana Rivers" }), "QUOTED");
    expect(onStatusChange).toHaveBeenCalledWith("l1", "QUOTED");
  });
});
