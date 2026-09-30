import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SkippedRowsTable } from "./SkippedRowsTable";

const labels = [
  { lineNumber: 2, preview: "LJ Air" },
  { lineNumber: 3, preview: "LJ Air again" },
  { lineNumber: 5, preview: "Old Plumbing" },
  { lineNumber: 6, preview: "Gone Roofing" },
  { lineNumber: 7, preview: "No Name Co" },
];

describe("SkippedRowsTable", () => {
  it("shows each skipped row by its spreadsheet row, with why it was skipped (#37)", () => {
    render(
      <SkippedRowsTable
        labels={labels}
        skipped={[
          { index: 1, kind: "IN_FILE", firstIndex: 0 },
          { index: 2, kind: "EXISTING", leadId: "lead-1", archived: false },
          { index: 3, kind: "EXISTING", leadId: "lead-2", archived: true },
          { index: 4, kind: "REJECTED", reason: "NO_CONTACT_CHANNEL" },
        ]}
      />,
    );

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["3", "5", "6", "7"]);
    expect(rows[0]).toHaveTextContent("Same business as row 2");
    expect(within(rows[1]).getByRole("link", { name: "Already in the CRM" })).toHaveAttribute(
      "href",
      "/?leadId=lead-1",
    );
    expect(within(rows[2]).getByRole("link", { name: "Already in the CRM, archived" })).toHaveAttribute(
      "href",
      "/?leadId=lead-2",
    );
    expect(rows[3]).toHaveTextContent("No contact channel");
  });

  it("renders nothing when every row imported", () => {
    const { container } = render(<SkippedRowsTable labels={labels} skipped={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
