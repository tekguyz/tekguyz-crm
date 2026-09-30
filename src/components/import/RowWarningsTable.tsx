"use client";

import type { RowWarning } from "@/lib/import/validate-rows";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/TableRow";

// Rows that import, but lost a junk cell on the way ("N/A" in a Facebook
// column, say). Shown on the review step and again on the summary, so the
// user can fix those links on the lead by hand.
export function RowWarningsTable({ warnings }: { warnings: RowWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-body-sm mb-2 text-ink-muted">
        {warnings.length.toLocaleString()} {warnings.length === 1 ? "row imports" : "rows import"}{" "}
        with an empty cell, because the cell was not the right kind of link:
      </p>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Row</TableHeaderCell>
            <TableHeaderCell>Lead</TableHeaderCell>
            <TableHeaderCell>What was left empty</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {warnings.map((warning) => (
            <TableRow key={warning.lineNumber} className="last:border-0">
              <TableCell className="text-ink-muted">{warning.lineNumber}</TableCell>
              <TableCell className="max-w-48 truncate">{warning.preview}</TableCell>
              <TableCell className="text-ink-muted">{warning.warnings.join(" · ")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
