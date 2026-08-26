"use client";

import { useState, useTransition } from "react";
import { IconAlertTriangle, IconPhoneOff } from "@tabler/icons-react";
import { CsvUploadDropzone } from "@/components/import/CsvUploadDropzone";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { importProspects, type ProspectImportResult } from "@/lib/actions/prospect-import-actions";
import { normalizePhoneDigits } from "@/lib/prospects/phone";
import {
  csvProspectSchema,
  REQUIRED_PROSPECT_HEADERS,
  type ValidatedProspectRow,
} from "@/lib/validation/csv-prospect-schema";
import type { ParsedCsvFile } from "@/lib/types/csv-import";

// CsvUploadDropzone is reused UNCHANGED — it already parses, guards the row cap
// and reports header/row problems, and it takes no leads-specific props. This
// panel is deliberately not a wizard: the leadgen CSV has a fixed header row
// this project does not choose, so there is no mapping step to present.

type Staged = {
  fileName: string;
  rows: ValidatedProspectRow[];
  rejected: number;
  withoutPhone: number;
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
  tone: "green" | "orange" | "pink" | "neutral";
}) {
  return (
    <div className="rounded-md border border-hairline p-3">
      <Badge tone={tone} className="text-body-md rounded-full px-2 font-semibold">
        {value.toLocaleString()}
      </Badge>
      <p className="text-body-md mt-2 font-medium">{label}</p>
      {detail && <p className="text-body-sm text-ink-muted">{detail}</p>}
    </div>
  );
}

export function ProspectImportPanel() {
  const [staged, setStaged] = useState<Staged | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [result, setResult] = useState<ProspectImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStaged(null);
    setHeaderError(null);
    setResult(null);
  }

  function handleParsed(file: ParsedCsvFile) {
    setResult(null);

    // place_id is the dedup key and name is the only other NOT NULL column.
    // A file without both is rejected whole rather than partially imported —
    // a half-imported scrape is worse than none, because the re-import that
    // would fix it is a no-op on everything already inserted.
    const missing = REQUIRED_PROSPECT_HEADERS.filter((header) => !file.headers.includes(header));
    if (missing.length > 0) {
      setStaged(null);
      setHeaderError(
        `This file is missing the ${missing.join(" and ")} column${missing.length > 1 ? "s" : ""}. Export it again from the leadgen pipeline.`,
      );
      return;
    }
    setHeaderError(null);

    const rows: ValidatedProspectRow[] = [];
    let rejected = 0;

    for (const raw of file.rows) {
      const parsed = csvProspectSchema.safeParse(raw);
      if (parsed.success) rows.push(parsed.data);
      else rejected += 1;
    }

    setStaged({
      fileName: file.fileName,
      rows,
      rejected,
      // Shown up front because a prospect with no comparable phone number is a
      // row nobody can cold-call and nobody can duplicate-check. It is not an
      // error — it still imports — but the operator should know the number.
      withoutPhone: rows.filter((row) => normalizePhoneDigits(row.phone) === null).length,
    });
  }

  function runImport() {
    if (!staged) return;
    startTransition(async () => {
      const outcome = await importProspects(staged.rows);
      setResult(outcome);
    });
  }

  if (result) {
    return (
      <section className="rounded-lg border border-hairline bg-canvas-pure p-4">
        <h2 className="text-h2 mb-1">Import complete</h2>
        <p className="text-body-sm mb-4 text-ink-muted">
          {result.rowsInFile.toLocaleString()} row
          {result.rowsInFile === 1 ? "" : "s"} in the file ·{" "}
          {result.imported.toLocaleString()} new prospect
          {result.imported === 1 ? "" : "s"} added.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile value={result.imported} label="Imported" tone="green" />
          <StatTile
            value={result.alreadyPresent}
            label="Already present"
            detail="Same Place ID — left untouched"
            tone="orange"
          />
          <StatTile
            value={result.intraFileDuplicates}
            label="Repeated in file"
            detail="Same Place ID twice in one export"
            tone="orange"
          />
          <StatTile
            value={result.duplicatePhoneMatches}
            label="Phone matches a lead"
            detail="Flagged for review, not blocked"
            tone="pink"
          />
        </div>

        {(result.rejectedServerSide > 0 || result.failedChunks > 0) && (
          <p className="text-body-md mt-3 flex items-start gap-2 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
            <IconAlertTriangle stroke={1.75} className="mt-0.5 size-4 shrink-0" />
            <span>
              {result.rejectedServerSide > 0 &&
                `${result.rejectedServerSide} row(s) failed the server-side re-check. `}
              {result.failedChunks > 0 &&
                `${result.failedChunks} batch(es) failed, affecting ${result.failedChunkRows} row(s). Re-run this file — rows that already landed are skipped.`}
            </span>
          </p>
        )}

        {result.error && (
          <p className="text-body-md mt-3 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
            {result.error}
          </p>
        )}

        <Button type="button" variant="secondary" className="mt-4" onClick={reset}>
          Import another file
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <CsvUploadDropzone onParsed={handleParsed} />

      {headerError && (
        <p className="text-body-md rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
          {headerError}
        </p>
      )}

      {staged && (
        <section className="rounded-lg border border-hairline bg-canvas-pure p-4">
          <h2 className="text-h2 mb-1">{staged.fileName}</h2>
          <p className="text-body-sm mb-4 text-ink-muted">
            {staged.rows.length.toLocaleString()} row
            {staged.rows.length === 1 ? "" : "s"} ready to import.
          </p>

          {staged.rejected > 0 && (
            <p className="text-body-md mb-3 flex items-start gap-2 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
              <IconAlertTriangle stroke={1.75} className="mt-0.5 size-4 shrink-0" />
              <span>
                {staged.rejected} row(s) have no Place ID or no business name and will be skipped.
              </span>
            </p>
          )}

          {staged.withoutPhone > 0 && (
            <p className="text-body-md mb-3 flex items-start gap-2 rounded-xs border border-hairline px-3 py-2 text-ink-muted">
              <IconPhoneOff stroke={1.75} className="mt-0.5 size-4 shrink-0" />
              <span>
                {staged.withoutPhone} row(s) have no usable phone number. They still import, but
                they cannot be called or duplicate-checked.
              </span>
            </p>
          )}

          <div className="flex gap-2">
            <Button type="button" onClick={runImport} disabled={pending || staged.rows.length === 0}>
              {pending ? "Importing…" : `Import ${staged.rows.length.toLocaleString()} prospects`}
            </Button>
            <Button type="button" variant="secondary" onClick={reset} disabled={pending}>
              Cancel
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
