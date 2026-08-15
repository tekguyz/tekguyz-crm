"use client";

import type { ValidationOutcome } from "@/lib/import/validate-rows";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/TableRow";

const PREVIEW_LIMIT = 5;

// Landmark <section> with Card's tokens rather than the Card primitive itself —
// same reasoning as ColumnMappingTable.
export function ValidationResultsTable({
  outcome,
  onBack,
  onImport,
  isImporting,
}: {
  outcome: ValidationOutcome;
  onBack: () => void;
  onImport: () => void;
  isImporting: boolean;
}) {
  const { valid, invalid } = outcome;

  return (
    <section className="rounded-lg border border-hairline bg-canvas-pure p-4">
      <h2 className="text-h2 mb-1">Review your rows</h2>
      <p className="text-body-sm mb-4 text-ink-muted">
        Rows that fail validation are skipped — the rest still import.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="green" className="rounded-full px-2">
          {valid.length.toLocaleString()} ready
        </Badge>
        {invalid.length > 0 && (
          <Badge tone="orange" className="rounded-full px-2">
            {invalid.length.toLocaleString()} with errors
          </Badge>
        )}
      </div>

      {invalid.length > 0 && (
        <div className="mb-4">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Row</TableHeaderCell>
                <TableHeaderCell>Value</TableHeaderCell>
                <TableHeaderCell>What&rsquo;s wrong</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invalid.map((failure) => (
                <TableRow key={failure.lineNumber} className="last:border-0">
                  <TableCell className="text-ink-muted">{failure.lineNumber}</TableCell>
                  <TableCell className="max-w-48 truncate">{failure.preview}</TableCell>
                  <TableCell className="text-pill-orange-fg">
                    {failure.errors.join(" · ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {valid.length > 0 && (
        <div className="mb-4">
          <p className="text-body-sm mb-2 text-ink-muted">
            Preview of what will be imported
            {valid.length > PREVIEW_LIMIT
              ? ` (first ${PREVIEW_LIMIT} of ${valid.length.toLocaleString()})`
              : ""}
            :
          </p>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Client name</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Company</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Keyed by index, not email — a valid row set can legitimately
                  contain the same email twice; that's what the intra-file
                  dedup step resolves later, so email isn't unique here. */}
              {valid.slice(0, PREVIEW_LIMIT).map((row, index) => (
                <TableRow key={index} className="last:border-0">
                  <TableCell className="max-w-48 truncate font-medium">
                    {row.client_name}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-ink-muted">{row.email}</TableCell>
                  <TableCell className="max-w-48 truncate text-ink-muted">
                    {row.company ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {valid.length === 0 && (
        <p className="text-body-md mb-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
          No rows passed validation, so there&rsquo;s nothing to import. Fix the errors above and
          upload the file again.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" onClick={onBack} disabled={isImporting}>
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onImport}
          disabled={isImporting || valid.length === 0}
        >
          {isImporting ? "Importing…" : `Import ${valid.length.toLocaleString()} leads`}
        </Button>
      </div>
    </section>
  );
}
