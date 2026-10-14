import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Lead } from "@/lib/leads/queries";
import { MembersProvider } from "@/components/shell/MembersContext";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { parseView, type ViewPage } from "@/lib/views/params";

vi.mock("@/components/leads/EditLeadDrawer", () => ({
  EditLeadDrawer: ({ open, lead }: { open: boolean; lead: Lead }) =>
    open ? <div data-testid="drawer">{lead.client_name}</div> : null,
}));

const LEAD = {
  id: "lead-1",
  client_name: "Amanda Chu",
  company: "GreenScape",
  email: "amanda@example.com",
  phone: "+1 305 555 0100",
  website: null,
  physical_address: null,
  social_google_business: null,
  social_facebook: null,
  social_instagram: null,
  social_whatsapp: null,
  lead_source: null,
  service_category: null,
  estimated_revenue: 4200,
  status: "QUOTED",
  outcome: null,
  actual_revenue: null,
  next_action_at: "2099-01-01T15:00:00.000Z",
  is_starred: false,
  ai_brief: null,
  archived: false,
  assigned_to: null,
} as Lead;

function renderTable(page: ViewPage, query: Record<string, string> = {}) {
  return render(
    <MembersProvider members={[]}>
      <LeadsTable
        page={page}
        leads={[LEAD]}
        view={parseView(page, query)}
        orgTimezone="UTC"
        currencyFormat="USD"
        emptyMessage="No contacts yet."
      />
    </MembersProvider>,
  );
}

const headers = () => screen.getAllByRole("columnheader").map((th) => th.textContent);

describe("LeadsTable", () => {
  it("shows the Contacts columns", () => {
    renderTable("contacts");
    expect(headers()).toEqual(["Name", "Stage", "Channels", "Owner"]);
  });

  it("shows the Pipeline columns, with the amount and the due label", () => {
    renderTable("pipeline");
    expect(headers()).toEqual(["Name", "Stage", "Amount", "Next action", "Owner"]);
    expect(screen.getByText("$4,200")).toBeInTheDocument();
  });

  it("does not make Owner or Channels sortable", () => {
    renderTable("contacts");
    expect(screen.queryByRole("link", { name: "Owner" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Channels" })).toBeNull();
  });

  it("links a header to its sort in the URL", () => {
    renderTable("contacts");
    expect(screen.getByRole("link", { name: "Name" })).toHaveAttribute("href", "/contacts?dir=desc");
    expect(screen.getByRole("link", { name: "Stage" })).toHaveAttribute("href", "/contacts?sort=stage");
  });

  it("opens the lead in the edit drawer", async () => {
    const user = userEvent.setup();
    renderTable("contacts");
    expect(screen.queryByTestId("drawer")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Amanda Chu/ }));
    expect(screen.getByTestId("drawer")).toHaveTextContent("Amanda Chu");
  });
});
