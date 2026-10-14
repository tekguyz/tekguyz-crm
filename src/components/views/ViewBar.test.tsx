import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ViewBar } from "@/components/views/ViewBar";
import { parseView, type ViewPage } from "@/lib/views/params";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function renderBar(page: ViewPage, query: Record<string, string> = {}) {
  render(<ViewBar page={page} view={parseView(page, query)} />);
  return userEvent.setup();
}

// Radix opens a menu from its trigger on Enter; that path does not depend on
// jsdom's pointer-event support.
async function openMenu(user: ReturnType<typeof userEvent.setup>, name: string | RegExp) {
  screen.getByRole("button", { name }).focus();
  await user.keyboard("{Enter}");
  return screen.findByRole("menu");
}

describe("ViewBar", () => {
  beforeEach(() => push.mockClear());

  it("names the view from its filters", () => {
    renderBar("pipeline", { stage: "QUOTED,ACTIVE" });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Open leads · Quoted, Active");
  });

  it("counts the filters that are not default on the Filter button", () => {
    renderBar("contacts", { archived: "true", mine: "true", stage: "NEW" });
    expect(screen.getByRole("button", { name: "Filter, 3 active" })).toBeInTheDocument();
  });

  it("calls the button just Filter when nothing is filtered", () => {
    renderBar("contacts");
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
  });

  it("adds a ticked stage to the URL", async () => {
    const user = renderBar("pipeline");
    await openMenu(user, "Filter");
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Quoted" }));
    expect(push).toHaveBeenCalledWith("/pipeline?stage=QUOTED", { scroll: false });
  });

  it("offers Status on Contacts only", async () => {
    const user = renderBar("pipeline");
    await openMenu(user, "Filter");
    expect(screen.queryByRole("menuitemradio", { name: "Archived" })).toBeNull();
  });

  it("resets the filters and keeps the sort", async () => {
    const user = renderBar("contacts", { archived: "true", mine: "true", sort: "amount" });
    await openMenu(user, /Filter/);
    await user.click(screen.getByRole("menuitem", { name: "Reset filters" }));
    expect(push).toHaveBeenCalledWith("/contacts?sort=amount", { scroll: false });
  });

  // The menu stays open so several stages can be picked in one visit. The
  // second tick lands before the server answers the first, so it must build
  // on the ticks already made, not on the view the page last rendered.
  it("keeps the first stage when a second is ticked before the page updates", async () => {
    const user = renderBar("pipeline");
    await openMenu(user, "Filter");
    await user.click(screen.getByRole("menuitemcheckbox", { name: "New" }));
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Quoted" }));
    expect(push).toHaveBeenLastCalledWith("/pipeline?stage=NEW,QUOTED", { scroll: false });
    expect(screen.getByRole("menuitemcheckbox", { name: "New" })).toHaveAttribute("aria-checked", "true");
  });

  it("names the active sort on the Sort button", () => {
    renderBar("pipeline");
    expect(screen.getByRole("button", { name: "Sort: Priority" })).toBeInTheDocument();
  });

  it("names a picked sort on the Sort button", () => {
    renderBar("contacts", { sort: "amount" });
    expect(screen.getByRole("button", { name: "Sort: Amount" })).toBeInTheDocument();
  });

  it("sorts by the field picked in Sort", async () => {
    const user = renderBar("pipeline");
    await openMenu(user, /^Sort/);
    await user.click(screen.getByRole("menuitemradio", { name: "Amount" }));
    expect(push).toHaveBeenCalledWith("/pipeline?sort=amount", { scroll: false });
  });

  it("offers Priority on Pipeline only", async () => {
    const user = renderBar("contacts");
    await openMenu(user, /^Sort/);
    expect(screen.queryByRole("menuitemradio", { name: "Priority" })).toBeNull();
  });

  it("puts Export CSV on Contacts only", () => {
    renderBar("contacts");
    expect(screen.getByRole("link", { name: "Export CSV" })).toHaveAttribute("href", "/api/leads/export");
  });

  it("has no Export CSV on Pipeline", () => {
    renderBar("pipeline");
    expect(screen.queryByRole("link", { name: "Export CSV" })).toBeNull();
  });

  it("puts the Board / Table switch on Pipeline only", () => {
    renderBar("pipeline");
    expect(screen.getByRole("link", { name: "Table" })).toHaveAttribute("href", "/pipeline?view=table");
    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute("aria-current", "page");
  });

  it("has no Board / Table switch on Contacts", () => {
    renderBar("contacts");
    expect(screen.queryByRole("group", { name: "Layout" })).toBeNull();
  });
});
