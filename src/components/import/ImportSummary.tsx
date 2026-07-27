"use client";

import type { BatchInsertResult } from "@/lib/actions/import-actions";

// The receipt moment: categorized totals, colour-coded by what they mean.
// Green = landed, neutral amber = no-op (a duplicate isn't an error), orange
// = genuinely didn't make it.
function StatTile({
  value,
  label,
  detail,
  tone,
}: {
  value: number;
  label: string;
  detail?: string;
  tone: "green" | "amber" | "orange";
}) {
  const tones = {
    green: "bg-pill-green-bg text-pill-green-fg",
    amber: "bg-pill-orange-bg text-pill-orange-fg",
    orange: "bg-pill-pink-bg text-pill-pink-fg",
  };

  return (
    <div className="rounded-md border border-hairline p-3">
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-sm font-semibold ${tones[tone]}`}
      >
        {value.toLocaleString()}
      </span>
      <p className="mt-2 text-sm font-medium">{label}</p>
      {detail && <p className="text-xs text-ink-muted">{detail}</p>}
    </div>
  );
}

export function ImportSummary({
  result,
  failedValidation,
  onImportAnother,
}: {
  result: BatchInsertResult;
  failedValidation: number;
  onImportAnother: () => void;
}) {
  const duplicateDetail = [
    result.existingActive > 0 ? `${result.existingActive} active` : null,
    result.existingArchived > 0 ? `${result.existingArchived} archived` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="rounded-lg border border-hairline bg-canvas-pure p-6 shadow-elevation-1">
      <h2 className="mb-1 text-base font-semibold">Import complete</h2>
      <p className="mb-4 text-xs text-ink-muted">
        {result.imported.toLocaleString()} new{" "}
        {result.imported === 1 ? "lead is" : "leads are"} now in your pipeline.
      </p>

      {result.error && (
        <p className="mb-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
          {result.error}
        </p>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile value={result.imported} label="Imported" tone="green" />
        <StatTile
          value={result.existingDuplicates}
          label="Already existed"
          detail={duplicateDetail || undefined}
          tone="amber"
        />
        <StatTile
          value={result.intraFileDuplicates}
          label="Duplicates in file"
          detail={result.intraFileDuplicates > 0 ? "First one of each was kept" : undefined}
          tone="amber"
        />
        <StatTile value={failedValidation} label="Failed validation" tone="orange" />
      </div>

      {result.rejectedServerSide > 0 && (
        <p className="mb-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
          {result.rejectedServerSide.toLocaleString()} row(s) were rejected during the server-side
          re-check and not imported.
        </p>
      )}

      {result.failedChunks > 0 && (
        <p className="mb-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
          {result.failedChunks} batch(es) covering {result.failedChunkRows.toLocaleString()} rows
          failed to process — retry recommended for those rows.
        </p>
      )}

      {result.existingArchived > 0 && (
        <p className="mb-4 text-xs text-ink-muted">
          Archived duplicates were skipped, not restored. Use Contacts → Archived to bring one back.
        </p>
      )}

      <button
        type="button"
        onClick={onImportAnother}
        className="rounded-md border border-hairline bg-canvas-pure px-3.5 py-1 text-sm font-medium text-ink-main shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
      >
        Import another file
      </button>
    </section>
  );
}
