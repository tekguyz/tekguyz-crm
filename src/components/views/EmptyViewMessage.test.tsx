import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { defaultView } from "@/lib/views/params";
import { EmptyViewMessage } from "./EmptyViewMessage";

describe("EmptyViewMessage", () => {
  it("offers a way back when a filter hides everything", () => {
    const view = { ...defaultView("contacts"), mine: true };
    render(<EmptyViewMessage page="contacts" view={view} text="No contacts are assigned to you." />);
    expect(screen.getByText("No contacts are assigned to you.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show all" })).toHaveAttribute("href", "/contacts");
  });

  it("shows only the text when no filter is on", () => {
    render(<EmptyViewMessage page="contacts" view={defaultView("contacts")} text="No contacts yet." />);
    expect(screen.getByText("No contacts yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Show all" })).toBeNull();
  });

  it("keeps the table layout and sort when it clears the filters", () => {
    const view = { ...defaultView("pipeline"), mine: true, layout: "table" as const };
    render(<EmptyViewMessage page="pipeline" view={view} text="No open leads match this view." />);
    expect(screen.getByRole("link", { name: "Show all" })).toHaveAttribute("href", "/pipeline?view=table");
  });
});
