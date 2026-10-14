"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowDown, IconArrowUp, type Icon } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/TableRow";
import {
  ColumnReorderHandle,
  ColumnResizeHandle,
  TableColumnGroup,
  columnHeaderProps,
  columnTableProps,
  useColumnLayout,
  type ColumnSpec,
} from "@/components/ui/table-columns";
import { cn } from "@/lib/utils/cn";

// The composed table (#47 step 9): the bare shell in TableRow.tsx plus the
// opt-in resize and reorder in table-columns.tsx, driven by a column config.
// First callers: Contacts and Pipeline, through components/leads/LeadsTable.
//
// Sort state is the URL's, not this component's. A sortable header is a
// <Link> to the href the caller builds, so a reload or a shared link keeps the
// view. Width and order are session-only, as on Prospects.
//
// One <button> per row, in the column marked `opensRow`. Its ::after
// stretches over the row (the <tr> is `relative`), so a click anywhere opens
// the row; links in other cells sit above it with `relative z-10` and are
// never inside the button (the ContactRow pattern — nesting them made Enter on
// a link open the row too).
//
// No selection, no inline edit, no grouping. Built when a feature needs them.

export type DataTableColumn<T, K extends string = string> = ColumnSpec<K> & {
  label: string;
  icon: Icon;
  cell: (row: T) => ReactNode;
  sortKey?: string;
  align?: "start" | "end";
  opensRow?: boolean;
};

export type DataTableSort = { key: string; dir: "asc" | "desc" };

export function DataTable<T, K extends string>({
  label,
  rows,
  columns,
  getRowId,
  onRowOpen,
  sort,
  sortHref,
  emptyMessage,
}: {
  label: string;
  rows: readonly T[];
  // Must be referentially stable (useMemo at the call site).
  columns: readonly DataTableColumn<T, K>[];
  getRowId: (row: T) => string;
  onRowOpen: (row: T) => void;
  sort: DataTableSort | null;
  sortHref: (key: string) => string;
  emptyMessage: ReactNode;
}) {
  const layout = useColumnLayout(columns);

  if (rows.length === 0) {
    return (
      <div className="text-body-md rounded-lg border border-dashed border-hairline px-3 py-8 text-center text-ink-muted">
        {emptyMessage}
      </div>
    );
  }

  const byId = new Map(columns.map((column) => [column.id, column]));
  const tableProps = columnTableProps(layout);

  return (
    // `relative overflow-hidden` is load-bearing (the Prospects fix): the
    // table's sr-only spans are position:absolute and must not escape to the
    // shell's <main> and make it scroll sideways.
    <div className="relative overflow-hidden rounded-lg border border-hairline bg-canvas-pure [&_tbody>tr:last-child]:border-b-0">
      <Table aria-label={label} {...tableProps}>
        <TableColumnGroup layout={layout} />
        <TableHead>
          <TableRow ref={layout.headerRowRef}>
            {layout.order.map((id, index) => {
              const column = byId.get(id)!;
              const header = columnHeaderProps(layout, id);
              // The handle sits 4px past its cell's trailing edge. On the last
              // column that edge is the table's own, so the scroll wrapper
              // would grow a sideways scrollbar. Prospects avoids it the same
              // way: its last column is not resizable.
              const resizable = column.resizable !== false && index < layout.order.length - 1;
              const sorted = sort !== null && column.sortKey === sort.key ? sort.dir : null;
              const ColumnIcon = column.icon;
              const icon = (
                <ColumnIcon className="size-4 shrink-0 text-ink-muted" stroke={1.75} aria-hidden="true" />
              );
              return (
                <TableHeaderCell
                  key={id}
                  {...header}
                  aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined}
                  className={cn(header.className, "whitespace-nowrap")}
                >
                  <div
                    className={cn("flex items-center gap-0.5", column.align === "end" && "justify-end")}
                  >
                    <ColumnReorderHandle layout={layout} id={id} label={column.label} />
                    {column.sortKey ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={sortHref(column.sortKey)} scroll={false}>
                          {icon}
                          {column.label}
                          {sorted === "asc" ? (
                            <IconArrowUp className="size-3.5" stroke={1.75} aria-hidden="true" />
                          ) : sorted === "desc" ? (
                            <IconArrowDown className="size-3.5" stroke={1.75} aria-hidden="true" />
                          ) : null}
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-body-sm inline-flex h-7 items-center gap-1.5 px-2">
                        {icon}
                        {column.label}
                      </span>
                    )}
                  </div>
                  {!resizable ? null : (
                    <ColumnResizeHandle layout={layout} id={id} label={column.label} />
                  )}
                </TableHeaderCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getRowId(row)} className="relative transition-colors hover:bg-canvas-soft">
              {layout.order.map((id) => {
                const column = byId.get(id)!;
                const content = column.cell(row);
                return (
                  <TableCell key={id} className={cn("h-12", column.align === "end" && "text-right")}>
                    {column.opensRow ? (
                      <button
                        type="button"
                        onClick={() => onRowOpen(row)}
                        className="flex w-full min-w-0 items-center rounded-sm text-left after:absolute after:inset-0 after:content-['']"
                      >
                        {content}
                      </button>
                    ) : (
                      content
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
