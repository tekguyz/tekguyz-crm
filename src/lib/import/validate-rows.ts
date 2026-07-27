import { csvLeadSchema, type ValidatedRow } from "@/lib/validation/csv-lead-schema";
import type { ColumnMapping, ParsedCsvRow } from "@/lib/types/csv-import";

export type RowFailure = {
  // 1-based and counting the header, so it matches what the user sees in
  // their spreadsheet's row gutter rather than a 0-based array index.
  lineNumber: number;
  errors: string[];
  preview: string;
};

export type ValidationOutcome = {
  valid: ValidatedRow[];
  invalid: RowFailure[];
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
  const invalid: RowFailure[] = [];

  rows.forEach((row, index) => {
    const mapped = applyMapping(row, mapping);
    const parsed = csvLeadSchema.safeParse(mapped);

    if (parsed.success) {
      valid.push(parsed.data);
      return;
    }

    invalid.push({
      lineNumber: index + 2,
      errors: parsed.error.issues.map((issue) => issue.message),
      preview: mapped.client_name?.trim() || mapped.email?.trim() || "(empty row)",
    });
  });

  return { valid, invalid };
}
