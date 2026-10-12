import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ContactLead } from "@/lib/leads/queries";
import { MembersProvider } from "@/components/shell/MembersContext";
import { ContactsList } from "@/components/contacts/ContactsList";

// The drawer is its own surface with its own suite; stubbed so this one stays
// about the row. It renders only while open, which is all these tests need.
vi.mock("@/components/leads/EditLeadDrawer", () => ({
  EditLeadDrawer: ({ open, lead }: { open: boolean; lead: ContactLead }) =>
    open ? <div data-testid="drawer">{lead.client_name}</div> : null,
}));

function makeLead(overrides: Partial<ContactLead> = {}): ContactLead {
  return {
    id: "lead-1",
    client_name: "Amanda Chu",
    company: "GreenScape Landscaping",
    email: "amanda@example.com",
    phone: "+1 305 555 0100",
    website: "greenscape.example",
    physical_address: null,
    social_google_business: null,
    social_facebook: null,
    social_instagram: null,
    social_whatsapp: null,
    lead_source: null,
    service_category: null,
    estimated_revenue: null,
    status: "QUALIFIED",
    outcome: null,
    actual_revenue: null,
    next_action_at: null,
    is_starred: false,
    ai_brief: null,
    archived: false,
    assigned_to: null,
    ...overrides,
  } as ContactLead;
}

const MEMBERS = [{ user_id: "u-1", email: "alex@tekguyz.test", role: "OWNER" }];

function renderList(contacts: ContactLead[], emptyMessage?: string) {
  return render(
    <MembersProvider members={MEMBERS}>
      <ContactsList contacts={contacts} emptyMessage={emptyMessage} />
    </MembersProvider>,
  );
}

describe("ContactsList", () => {
  it("shows one row per contact with its avatar, name, company and stage", () => {
    renderList([makeLead(), makeLead({ id: "lead-2", client_name: "Ben Ortiz", company: null, status: "NEW" })]);

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Amanda Chu")).toBeInTheDocument();
    expect(within(rows[0]).getByText("GreenScape Landscaping")).toBeInTheDocument();
    expect(within(rows[0]).getByText("AC")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Ben Ortiz")).toBeInTheDocument();
  });

  it("gives each channel a real, labelled link that is not inside the row's button", () => {
    renderList([makeLead()]);

    const call = screen.getByRole("link", { name: "Call Amanda Chu" });
    expect(call).toHaveAttribute("href", "tel:+1 305 555 0100");
    expect(screen.getByRole("link", { name: "Email Amanda Chu" })).toHaveAttribute(
      "href",
      "mailto:amanda@example.com",
    );
    // The bug this replaces: links nested in a role=button card, so Enter on a
    // link also opened the drawer.
    for (const link of screen.getAllByRole("link")) {
      expect(link.closest("button, [role='button']")).toBeNull();
    }
  });

  it("opens the lead when the name is pressed, and not when a channel link is", async () => {
    const user = userEvent.setup();
    renderList([makeLead()]);

    expect(screen.queryByTestId("drawer")).toBeNull();

    screen.getByRole("link", { name: "Call Amanda Chu" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.queryByTestId("drawer")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Amanda Chu/ }));
    expect(screen.getByTestId("drawer")).toHaveTextContent("Amanda Chu");
  });

  it("shows the owner with an avatar, and says Unassigned when there is none", () => {
    renderList([makeLead({ assigned_to: "u-1" }), makeLead({ id: "lead-2", client_name: "Ben Ortiz" })]);

    const [owned, unowned] = screen.getAllByRole("listitem");
    expect(within(owned).getByText("alex")).toBeInTheDocument();
    expect(within(owned).getByText("A")).toBeInTheDocument();
    expect(within(unowned).getByText("Unassigned")).toBeInTheDocument();
  });

  it("shows the empty message when there are no contacts", () => {
    renderList([], "No contacts are assigned to you.");

    expect(screen.getByText("No contacts are assigned to you.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
