"use client";

import type { BatchInsertResult } from "@/lib/actions/import-actions";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

// The receipt moment: categorized totals, colour-coded by what they mean.
// Green = landed, amber = no-op (a duplicate isn't an error), orange = didn't
// make it. The three local names map onto the Badge palette exactly as the
// hand-rolled version did — "orange" has always painted the pink pill.
const TILE_TONE: Record<"green" | "amber" | "orange", BadgeTone> = {
  green: "green",
  amber: "orange",
  orange: "pink",
};

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
  return (
    <div className="rounded-md border border-hairline p-3">
      <Badge tone={TILE_TONE[tone]} className="text-body-md rounded-full px-2 font-semibold">
        {value.toLocaleString()}
      </Badge>
      <p className="text-body-md mt-2 font-medium">{label}</p>
      {detail && <p className="text-body-sm text-ink-muted">{detail}</p>}
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
    <section className="rounded-lg border border-hairline bg-canvas-pure p-4">
      <h2 className="text-h2 mb-1">Import complete</h2>
      <p className="text-body-sm mb-4 text-ink-muted">
        {result.imported.toLocaleString()} new{" "}
        {result.imported === 1 ? "lead is" : "leads are"} now in your pipeline.
      </p>

      {result.error && (
        <p className="text-body-md mb-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
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
        <p className="text-body-md mb-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
          {result.rejectedServerSide.toLocaleString()} row(s) were rejected during the server-side
          re-check and not imported.
        </p>
      )}

      {result.failedChunks > 0 && (
        <p className="text-body-md mb-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
          {result.failedChunks} batch(es) covering {result.failedChunkRows.toLocaleString()} rows
          failed to process — retry recommended for those rows.
        </p>
      )}

      {result.existingArchived > 0 && (
        <p className="text-body-sm mb-4 text-ink-muted">
          Archived duplicates were skipped, not restored. Use Contacts → Archived to bring one back.
        </p>
      )}

      <Button type="button" variant="secondary" onClick={onImportAnother}>
        Import another file
      </Button>
    </section>
  );
}
