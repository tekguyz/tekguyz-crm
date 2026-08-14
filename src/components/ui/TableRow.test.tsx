import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "./TableRow";

function renderTable(cold = false) {
  return render(
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow cold={cold}>
          <TableCell>Acme</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
}

describe("Table shell", () => {
  it("renders semantic table markup", () => {
    renderTable();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Acme" })).toBeInTheDocument();
  });

  it("separates rows with a hairline by default", () => {
    renderTable();
    const row = screen.getByRole("cell", { name: "Acme" }).closest("tr");
    expect(row).toHaveClass("border-hairline");
  });

  it("switches a row to the dashed cold border when overdue", () => {
    renderTable(true);
    const row = screen.getByRole("cell", { name: "Acme" }).closest("tr");
    expect(row).toHaveClass("border-dashed", "border-cold");
  });

  it("merges a caller className", () => {
    render(
      <Table className="mt-4">
        <TableBody>
          <TableRow>
            <TableCell>Acme</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("table")).toHaveClass("mt-4");
  });
});
