"use client";

import Link from "next/link";
import type { SkippedRow } from "@/lib/import/insert-chunks";
import type { RowLabel } from "@/lib/import/validate-rows";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/TableRow";

// The RPC's reject codes, plus the Server Action's own re-check, in words.
const REJECT_REASON: Record<string, string> = {
  NO_NAME: "No name",
  NO_CONTACT_CHANNEL: "No contact channel",
  SERVER_RECHECK: "Refused by the server re-check",
};

const linkClass = "text-accent underline underline-offset-2";

function Why({ row, labels }: { row: SkippedRow; labels: RowLabel[] }) {
  if (row.kind === "IN_FILE") {
    return <>Same business as row {labels[row.firstIndex]?.lineNumber ?? "?"}</>;
  }
  if (row.kind === "EXISTING") {
    // The app-wide ?leadId= deep link opens the matched lead's profile.
    return (
      <Link href={`/?leadId=${row.leadId}`} className={linkClass}>
        {row.archived ? "Already in the CRM, archived" : "Already in the CRM"}
      </Link>
    );
  }
  return <>{REJECT_REASON[row.reason] ?? "Refused"}</>;
}

// Every row that did not import, by its spreadsheet row, and why (#37). A
// duplicate names the lead it matched, so the user can open it.
export function SkippedRowsTable({ skipped, labels }: { skipped: SkippedRow[]; labels: RowLabel[] }) {
  if (skipped.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-body-sm mb-2 text-ink-muted">
        {skipped.length.toLocaleString()} {skipped.length === 1 ? "row was" : "rows were"} not imported:
      </p>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Row</TableHeaderCell>
            <TableHeaderCell>Lead</TableHeaderCell>
            <TableHeaderCell>Why</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {skipped.map((row) => (
            <TableRow key={row.index} className="last:border-0">
              <TableCell className="text-ink-muted">{labels[row.index]?.lineNumber ?? "?"}</TableCell>
              <TableCell className="max-w-48 truncate">{labels[row.index]?.preview}</TableCell>
              <TableCell className="text-ink-muted">
                <Why row={row} labels={labels} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
