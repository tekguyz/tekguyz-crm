import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconPhone, IconUser } from "@tabler/icons-react";
import { describe, expect, it, vi } from "vitest";

import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";

type Row = { id: string; name: string; phone: string };

const ROWS: Row[] = [
  { id: "r1", name: "Ada Park", phone: "+13055550100" },
  { id: "r2", name: "Ben Ortiz", phone: "+13055550101" },
];

const COLUMNS: DataTableColumn<Row, "name" | "phone">[] = [
  { id: "name", label: "Name", icon: IconUser, sortKey: "name", opensRow: true, cell: (row) => row.name },
  {
    id: "phone",
    label: "Phone",
    icon: IconPhone,
    cell: (row) => (
      <a href={`tel:${row.phone}`} className="relative z-10">
        Call {row.name}
      </a>
    ),
  },
];

function renderTable(overrides: Partial<Parameters<typeof DataTable<Row, "name" | "phone">>[0]> = {}) {
  const onRowOpen = vi.fn();
  render(
    <DataTable
      label="People"
      rows={ROWS}
      columns={COLUMNS}
      getRowId={(row) => row.id}
      onRowOpen={onRowOpen}
      sort={{ key: "name", dir: "asc" }}
      sortHref={(key) => `/people?sort=${key}`}
      emptyMessage="Nobody here."
      {...overrides}
    />,
  );
  return { onRowOpen };
}

describe("DataTable", () => {
  it("puts the column's icon in each header", () => {
    renderTable();
    const [name, phone] = screen.getAllByRole("columnheader");
    expect(name.querySelector(".tabler-icon-user")).not.toBeNull();
    expect(phone.querySelector(".tabler-icon-phone")).not.toBeNull();
  });

  it("sets aria-sort on the sorted header only", () => {
    renderTable({ sort: { key: "name", dir: "desc" } });
    const [name, phone] = screen.getAllByRole("columnheader");
    expect(name).toHaveAttribute("aria-sort", "descending");
    expect(phone).not.toHaveAttribute("aria-sort");
  });

  it("sets no aria-sort when the sort is not a column", () => {
    renderTable({ sort: null });
    for (const header of screen.getAllByRole("columnheader")) {
      expect(header).not.toHaveAttribute("aria-sort");
    }
  });

  it("makes a sortable header a link to its sort, and leaves the others plain", () => {
    renderTable();
    const [name, phone] = screen.getAllByRole("columnheader");
    expect(within(name).getByRole("link", { name: "Name" })).toHaveAttribute("href", "/people?sort=name");
    expect(within(phone).queryByRole("link")).toBeNull();
  });

  it("opens a row from its name button", async () => {
    const user = userEvent.setup();
    const { onRowOpen } = renderTable();
    await user.click(screen.getByRole("button", { name: "Ada Park" }));
    expect(onRowOpen).toHaveBeenCalledWith(ROWS[0]);
  });

  it("does not open the row from a link in it, and never nests the link", async () => {
    const user = userEvent.setup();
    const { onRowOpen } = renderTable();
    const call = screen.getByRole("link", { name: "Call Ada Park" });
    expect(call.closest("button")).toBeNull();
    call.focus();
    await user.keyboard("{Enter}");
    expect(onRowOpen).not.toHaveBeenCalled();
  });

  // The handle sits 4px past its cell's edge. On the last column that edge is
  // the table's, so the scroll wrapper grew a sideways scrollbar.
  it("gives every column but the last a resize handle", () => {
    renderTable();
    const handles = screen.getAllByRole("separator");
    expect(handles).toHaveLength(1);
    expect(handles[0]).toHaveAccessibleName("Resize Name column");
  });

  it("gives every resize handle a current width before any drag", () => {
    renderTable();
    const handles = screen.getAllByRole("separator");
    expect(handles.length).toBeGreaterThan(0);
    for (const handle of handles) {
      expect(handle).toHaveAttribute("aria-valuenow");
      expect(Number(handle.getAttribute("aria-valuenow"))).not.toBeNaN();
    }
  });

  it("shows the empty message and no table when there are no rows", () => {
    renderTable({ rows: [] });
    expect(screen.getByText("Nobody here.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
