"use client";

import { HelpTooltip } from "@/components/help/HelpTooltip";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/TableRow";
import {
  MAPPABLE_FIELDS,
  type ColumnMapping,
  type MappableField,
  type ParsedCsvFile,
} from "@/lib/types/csv-import";

const REQUIRED_FIELDS = MAPPABLE_FIELDS.filter((field) => field.required);

function findDuplicate(mapping: ColumnMapping) {
  const seen = new Map<MappableField, string>();

  for (const [column, field] of Object.entries(mapping)) {
    if (field === "ignore") continue;
    const first = seen.get(field);
    if (first) return { field, columns: [first, column] };
    seen.set(field, column);
  }
  return null;
}

// Kept as a <section> rather than the Card primitive: Card renders a <div> and
// this is a real landmark for the wizard step. Same deliberate landmark-vs-Card
// split KanbanColumn makes. The tokens are Card's own, minus the v1 shadow —
// wizard panels are Level 0 in v2.
export function ColumnMappingTable({
  file,
  mapping,
  onChange,
  onBack,
  onContinue,
}: {
  file: ParsedCsvFile;
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const mapped = new Set(Object.values(mapping));
  const duplicate = findDuplicate(mapping);
  const missingRequired = REQUIRED_FIELDS.filter((field) => !mapped.has(field.id));
  const blocked = duplicate !== null || missingRequired.length > 0;

  const duplicateLabel = duplicate
    ? MAPPABLE_FIELDS.find((field) => field.id === duplicate.field)?.label
    : null;

  return (
    <section className="rounded-lg border border-hairline bg-canvas-pure p-4">
      <h2 className="text-h2 mb-1 flex items-center gap-1.5">
        Match your columns
        <HelpTooltip
          topicId="csv-import"
          blurb="Columns are auto-matched when the header is unambiguous. Change any row's dropdown to fix a mapping, or set it to Ignore to skip that column."
        />
      </h2>
      <p className="text-body-sm mb-4 text-ink-muted">
        {file.rows.length.toLocaleString()} rows from {file.fileName}. Anything you leave as
        &ldquo;Ignore&rdquo; won&rsquo;t be imported.
      </p>

      {/* Green = this required field is satisfied, orange = still missing. A
          functional readiness signal wearing a Badge, not decoration — the
          green/orange split is exactly what `blocked` below is computed from. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-body-sm text-ink-muted">Required:</span>
        {REQUIRED_FIELDS.map((field) => (
          <Badge
            key={field.id}
            tone={mapped.has(field.id) ? "green" : "orange"}
            className="rounded-full px-2"
          >
            {field.label}
          </Badge>
        ))}
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>CSV column</TableHeaderCell>
            <TableHeaderCell>First value</TableHeaderCell>
            <TableHeaderCell>Maps to</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {file.headers.map((header) => (
            <TableRow key={header} className="last:border-0">
              <TableCell className="max-w-48 truncate font-medium">{header}</TableCell>
              <TableCell className="max-w-48 truncate text-ink-muted">
                {file.rows[0]?.[header]?.trim() || "—"}
              </TableCell>
              <TableCell>
                <Select
                  aria-label={`Map ${header} to`}
                  value={mapping[header] ?? "ignore"}
                  onChange={(e) =>
                    onChange({ ...mapping, [header]: e.target.value as MappableField })
                  }
                >
                  <option value="ignore">Ignore this column</option>
                  {MAPPABLE_FIELDS.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                      {field.required ? " (required)" : ""}
                    </option>
                  ))}
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {duplicate && (
        <p className="text-body-md mt-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
          &ldquo;{duplicate.columns[0]}&rdquo; and &ldquo;{duplicate.columns[1]}&rdquo; are both
          mapped to {duplicateLabel}. Each field can only be filled by one column — set one of them
          to Ignore.
        </p>
      )}
      {!duplicate && missingRequired.length > 0 && (
        <p className="text-body-md mt-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
          Map a column to {missingRequired.map((field) => field.label).join(" and ")} before
          continuing.
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button type="button" variant="primary" onClick={onContinue} disabled={blocked}>
          Continue
        </Button>
      </div>
    </section>
  );
}
