import { clearJunkChannelCells } from "@/lib/import/channel-cells";
import { csvLeadSchema, type ValidatedRow } from "@/lib/validation/csv-lead-schema";
import type { ColumnMapping, ParsedCsvRow } from "@/lib/types/csv-import";

export type RowFailure = {
  // 1-based and counting the header, so it matches what the user sees in
  // their spreadsheet's row gutter rather than a 0-based array index. It
  // counts rows, not text lines: a brief with line breaks is still one row.
  lineNumber: number;
  errors: string[];
  preview: string;
};

// A row that imports, but lost a junk cell on the way (@/lib/import/channel-cells).
export type RowWarning = {
  lineNumber: number;
  preview: string;
  warnings: string[];
};

// Which spreadsheet row a valid row came from. validLabels[i] names valid[i];
// the import summary uses it to show the row a skipped lead sat on.
export type RowLabel = {
  lineNumber: number;
  preview: string;
};

export type ValidationOutcome = {
  valid: ValidatedRow[];
  validLabels: RowLabel[];
  invalid: RowFailure[];
  warnings: RowWarning[];
};

// Projects a raw CSV row through the user's column mapping into the shape
// csvLeadSchema expects. Columns mapped to "ignore" are dropped here, so
// nothing unmapped can reach the database even if the CSV carried it.
function applyMapping(row: ParsedCsvRow, mapping: ColumnMapping): Record<string, string> {
  const mapped: Record<string, string> = {};

  for (const [column, field] of Object.entries(mapping)) {
    if (field === "ignore") continue;
    const value = row[column];
    if (value !== undefined) mapped[field] = value;
  }
  return mapped;
}

export function validateRows(rows: ParsedCsvRow[], mapping: ColumnMapping): ValidationOutcome {
  const valid: ValidatedRow[] = [];
  const validLabels: RowLabel[] = [];
  const invalid: RowFailure[] = [];
  const warnings: RowWarning[] = [];

  rows.forEach((row, index) => {
    const mapped = applyMapping(row, mapping);
    const lineNumber = index + 2;
    const preview = mapped.client_name?.trim() || mapped.email?.trim() || "(empty row)";

    // Junk cells are emptied before the schema sees the row, so a junk cell
    // can only refuse a row by leaving it with no Contact Channel.
    const cleaned = clearJunkChannelCells(mapped);
    const parsed = csvLeadSchema.safeParse(cleaned.row);

    if (parsed.success) {
      valid.push(parsed.data);
      validLabels.push({ lineNumber, preview });
      if (cleaned.warnings.length > 0) warnings.push({ lineNumber, preview, warnings: cleaned.warnings });
      return;
    }

    // A refused row lists its emptied cells first: they are usually why it
    // has no channel left.
    invalid.push({
      lineNumber,
      errors: [...cleaned.warnings, ...parsed.error.issues.map((issue) => issue.message)],
      preview,
    });
  });

  return { valid, validLabels, invalid, warnings };
}
