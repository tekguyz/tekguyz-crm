"use client";

import { HelpTooltip } from "@/components/help/HelpTooltip";
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
    <section className="rounded-lg border border-hairline bg-canvas-pure p-6 shadow-elevation-1">
      <h2 className="mb-1 flex items-center gap-1.5 text-base font-semibold">
        Match your columns
        <HelpTooltip
          topicId="csv-import"
          blurb="Columns are auto-matched when the header is unambiguous. Change any row's dropdown to fix a mapping, or set it to Ignore to skip that column."
        />
      </h2>
      <p className="mb-4 text-xs text-ink-muted">
        {file.rows.length.toLocaleString()} rows from {file.fileName}. Anything you leave as
        &ldquo;Ignore&rdquo; won&rsquo;t be imported.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-muted">Required:</span>
        {REQUIRED_FIELDS.map((field) => {
          const satisfied = mapped.has(field.id);
          return (
            <span
              key={field.id}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                satisfied
                  ? "bg-pill-green-bg text-pill-green-fg"
                  : "bg-pill-orange-bg text-pill-orange-fg"
              }`}
            >
              {field.label}
            </span>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-ink-muted">
              <th className="pb-2 pr-4 font-medium">CSV column</th>
              <th className="pb-2 pr-4 font-medium">First value</th>
              <th className="pb-2 font-medium">Maps to</th>
            </tr>
          </thead>
          <tbody>
            {file.headers.map((header) => (
              <tr key={header} className="border-b border-hairline last:border-0">
                <td className="max-w-48 truncate py-2 pr-4 font-medium">{header}</td>
                <td className="max-w-48 truncate py-2 pr-4 text-ink-muted">
                  {file.rows[0]?.[header]?.trim() || "—"}
                </td>
                <td className="py-2">
                  <select
                    value={mapping[header] ?? "ignore"}
                    onChange={(e) =>
                      onChange({ ...mapping, [header]: e.target.value as MappableField })
                    }
                    className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none"
                  >
                    <option value="ignore">Ignore this column</option>
                    {MAPPABLE_FIELDS.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.label}
                        {field.required ? " (required)" : ""}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {duplicate && (
        <p className="mt-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
          &ldquo;{duplicate.columns[0]}&rdquo; and &ldquo;{duplicate.columns[1]}&rdquo; are both
          mapped to {duplicateLabel}. Each field can only be filled by one column — set one of them
          to Ignore.
        </p>
      )}
      {!duplicate && missingRequired.length > 0 && (
        <p className="mt-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
          Map a column to {missingRequired.map((field) => field.label).join(" and ")} before
          continuing.
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-hairline bg-canvas-pure px-3.5 py-1 text-sm font-medium text-ink-main shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={blocked}
          className="rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
        >
          Continue
        </button>
      </div>
    </section>
  );
}
