import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HeaderCount, PageHeader } from "@/components/shell/PageHeader";

describe("PageHeader", () => {
  it("makes the destination's nav label the page's one h1", () => {
    render(<PageHeader href="/contacts" />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Contacts");
  });

  it("puts the count beside the title and the actions after it", () => {
    const { container } = render(
      <PageHeader
        href="/contacts"
        count={<HeaderCount n={20} noun="contacts" />}
        actions={<button type="button">New lead</button>}
      />,
    );
    // The noun is for a screen reader; a sighted user reads the number beside
    // the title.
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(container).toHaveTextContent("Contacts20 contacts");
    expect(screen.getByRole("button", { name: "New lead" })).toBeInTheDocument();
  });

  it("titles a nested route itself and links back to its parent", () => {
    render(<PageHeader href="/prospects" title="Import prospects" parent />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Import prospects");
    expect(screen.getByRole("link", { name: "Prospects" })).toHaveAttribute("href", "/prospects");
  });

  it("throws on a destination the nav does not own", () => {
    expect(() => render(<PageHeader href="/nowhere" />)).toThrow();
  });
});
