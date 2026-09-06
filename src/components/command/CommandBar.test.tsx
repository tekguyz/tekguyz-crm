import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom implements no layout, so OptionRow's scrollIntoView effect would throw
// before any assertion ran. Same shim OptionRow's own test uses.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

const lead = {
  id: "lead-1",
  client_name: "Amanda Chu",
  company: "Northgate Dental",
  email: "amanda@northgate.example",
  phone: null,
  website: null,
  physical_address: null,
  social_google_business: null,
  social_facebook: null,
  social_instagram: null,
  lead_source: null,
  service_category: null,
  estimated_revenue: 0,
  status: "NEW",
  outcome: null,
  actual_revenue: null,
  next_action_at: "2026-09-01T15:00:00.000Z",
  is_starred: false,
  ai_brief: null,
  archived: false,
  assigned_to: null,
};

const openTask = {
  id: "task-1",
  title: "Send the quote",
  due_at: "2026-09-01T15:00:00.000Z",
  completed: false,
  lead_id: "lead-1",
  client_name: "Amanda Chu",
};

const doneTask = {
  id: "task-2",
  title: "Quote follow-up call",
  due_at: "2026-08-20T15:00:00.000Z",
  completed: true,
  lead_id: "lead-1",
  client_name: "Amanda Chu",
};

// Belongs to the signed-in tenant. `city` is what the Prospects group's
// subtitle and its Fuse index key on, and it is unique to this group.
const prospect = {
  id: "prospect-1",
  name: "Redwood Plumbing",
  category: "Plumber",
  city: "Gisborne",
  phone: "+64 6 555 0101",
  status: "NEW",
};

const fetchSearchableContacts = vi.fn(async () => [lead]);
const fetchSearchableTasks = vi.fn(async () => [openTask, doneTask]);
// The source is RLS-scoped server-side (searchProspectsForOrg filters on the
// org getCurrentOrg() resolved), so a prospect in another tenant never reaches
// this boundary at all. Returning only the in-tenant row is what that looks
// like from the client's side; the cross-tenant assertion below pins that the
// palette renders exactly what the boundary returned and invents nothing.
const fetchSearchableProspects = vi.fn(async () => [prospect]);
const routerPush = vi.fn();
const profileSheetProps = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("@/lib/leads/actions", () => ({
  fetchSearchableContacts: () => fetchSearchableContacts(),
}));

vi.mock("@/lib/tasks/actions", () => ({
  fetchSearchableTasks: () => fetchSearchableTasks(),
}));

vi.mock("@/lib/actions/prospect-actions", () => ({
  fetchSearchableProspects: () => fetchSearchableProspects(),
}));

// ProfileSheet pulls in the whole profile module tree (server-action
// boundaries included), so it is stubbed at its own boundary. What this suite
// cares about is which props CommandBar hands it.
vi.mock("@/components/leads/profile/ProfileSheet", () => ({
  ProfileSheet: (props: Record<string, unknown>) => {
    profileSheetProps(props);
    return <div data-testid="profile-sheet" />;
  },
}));

const { CommandBar } = await import("./CommandBar");

// "Amanda Chu" appears in BOTH groups — as the contact's own name and as the
// parent-lead subtitle on every task row — so every query here anchors on
// something unique to one group: the company for the contact, the title for a
// task.
const CONTACT_ROW = /Northgate Dental/;

async function openPalette() {
  render(<CommandBar open onClose={() => {}} />);
  await screen.findByRole("option", { name: CONTACT_ROW });
}

describe("CommandBar — grouped results", () => {
  beforeEach(() => {
    profileSheetProps.mockClear();
    routerPush.mockClear();
    fetchSearchableContacts.mockClear();
    fetchSearchableTasks.mockClear();
    fetchSearchableProspects.mockClear();
  });

  it("fetches each source once per open, not per keystroke", async () => {
    const user = userEvent.setup();
    await openPalette();

    await user.type(screen.getByRole("combobox"), "quote");

    expect(fetchSearchableContacts).toHaveBeenCalledTimes(1);
    expect(fetchSearchableTasks).toHaveBeenCalledTimes(1);
    expect(fetchSearchableProspects).toHaveBeenCalledTimes(1);
  });

  it("renders all three labelled groups when every source matches", async () => {
    await openPalette();

    expect(screen.getByRole("group", { name: "Contacts" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Prospects" })).toBeInTheDocument();
  });

  it("renders no empty Prospects header when the query matches no prospect", async () => {
    const user = userEvent.setup();
    await openPalette();

    // Matches a task title only — no prospect scores against it.
    await user.type(screen.getByRole("combobox"), "quote");

    await waitFor(() => expect(screen.queryByRole("group", { name: "Prospects" })).toBeNull());
    expect(screen.getByRole("group", { name: "Tasks" })).toBeInTheDocument();
  });

  it("shows only the prospects the RLS-scoped source returned — nothing cross-tenant", async () => {
    await openPalette();

    const group = screen.getByRole("group", { name: "Prospects" });
    const rows = within(group).getAllByRole("option");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Redwood Plumbing");
    expect(screen.queryByText(/Ashfield Roofing/)).toBeNull();
  });

  it("renders no empty group header when one source has no matches", async () => {
    const user = userEvent.setup();
    await openPalette();

    // Matches a task title only — no contact scores against it.
    await user.type(screen.getByRole("combobox"), "quote");

    await waitFor(() => expect(screen.queryByRole("group", { name: "Contacts" })).toBeNull());
    expect(screen.getByRole("group", { name: "Tasks" })).toBeInTheDocument();
  });

  it("shows a completed task using TaskRow's existing strikethrough convention", async () => {
    await openPalette();

    const row = screen.getByRole("option", { name: /Quote follow-up call/ });
    expect(within(row).getByText("Quote follow-up call").className).toMatch(/line-through/);
  });

  it("runs arrow keys continuously across all three groups", async () => {
    const user = userEvent.setup();
    await openPalette();
    const input = screen.getByRole("combobox");

    // One contact, two tasks, one prospect — four indices, two seams.
    expect(input).toHaveAttribute("aria-activedescendant", expect.stringContaining("lead-1"));

    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", expect.stringContaining("task-1"));

    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", expect.stringContaining("task-2"));

    // The second seam: last task into first prospect, no dead keypress.
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", expect.stringContaining("prospect-1"));

    await user.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-activedescendant", expect.stringContaining("task-2"));
  });

  it("selects the prospect the keyboard landed on at the third group", async () => {
    const user = userEvent.setup();
    await openPalette();

    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{Enter}");

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/prospects?highlight=prospect-1"));
  });

  it("navigates to /prospects naming the row, and opens no profile sheet", async () => {
    const user = userEvent.setup();
    await openPalette();

    await user.click(screen.getByRole("option", { name: /Redwood Plumbing/ }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledTimes(1));
    // The ?highlight= param IS the arrival highlight's whole input — the page
    // reads it and hands it to ProspectsTable's useArrivalHighlight.
    expect(routerPush).toHaveBeenCalledWith("/prospects?highlight=prospect-1");
    expect(profileSheetProps).not.toHaveBeenCalled();
  });

  it("opens the task's parent lead and passes the task id to highlight", async () => {
    const user = userEvent.setup();
    await openPalette();

    await user.click(screen.getByRole("option", { name: /Send the quote/ }));

    await waitFor(() => expect(profileSheetProps).toHaveBeenCalled());
    const props = profileSheetProps.mock.lastCall![0];
    expect(props.lead.id).toBe("lead-1");
    expect(props.highlightTaskId).toBe("task-1");
  });

  it("passes highlightTaskId for a COMPLETED task result too", async () => {
    const user = userEvent.setup();
    await openPalette();

    await user.click(screen.getByRole("option", { name: /Quote follow-up call/ }));

    await waitFor(() => expect(profileSheetProps).toHaveBeenCalled());
    expect(profileSheetProps.mock.lastCall![0].highlightTaskId).toBe("task-2");
  });

  it("opens a contact result with no highlight, exactly as before", async () => {
    const user = userEvent.setup();
    await openPalette();

    await user.click(screen.getByRole("option", { name: CONTACT_ROW }));

    await waitFor(() => expect(profileSheetProps).toHaveBeenCalled());
    const props = profileSheetProps.mock.lastCall![0];
    expect(props.lead.id).toBe("lead-1");
    expect(props.highlightTaskId).toBeNull();
  });
});
