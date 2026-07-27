"use client";

import type { ValidationOutcome } from "@/lib/import/validate-rows";

const PREVIEW_LIMIT = 5;

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
    <section className="rounded-lg border border-hairline bg-canvas-pure p-6 shadow-elevation-1">
      <h2 className="mb-1 text-base font-semibold">Review your rows</h2>
      <p className="mb-4 text-xs text-ink-muted">
        Rows that fail validation are skipped — the rest still import.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-pill-green-bg px-2 py-0.5 text-xs font-medium text-pill-green-fg">
          {valid.length.toLocaleString()} ready
        </span>
        {invalid.length > 0 && (
          <span className="rounded-full bg-pill-orange-bg px-2 py-0.5 text-xs font-medium text-pill-orange-fg">
            {invalid.length.toLocaleString()} with errors
          </span>
        )}
      </div>

      {invalid.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs text-ink-muted">
                <th className="pb-2 pr-4 font-medium">Row</th>
                <th className="pb-2 pr-4 font-medium">Value</th>
                <th className="pb-2 font-medium">What&rsquo;s wrong</th>
              </tr>
            </thead>
            <tbody>
              {invalid.map((failure) => (
                <tr key={failure.lineNumber} className="border-b border-hairline last:border-0">
                  <td className="py-2 pr-4 text-ink-muted">{failure.lineNumber}</td>
                  <td className="max-w-48 truncate py-2 pr-4">{failure.preview}</td>
                  <td className="py-2 text-pill-orange-fg">{failure.errors.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {valid.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <p className="mb-2 text-xs text-ink-muted">
            Preview of what will be imported
            {valid.length > PREVIEW_LIMIT
              ? ` (first ${PREVIEW_LIMIT} of ${valid.length.toLocaleString()})`
              : ""}
            :
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs text-ink-muted">
                <th className="pb-2 pr-4 font-medium">Client name</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 font-medium">Company</th>
              </tr>
            </thead>
            <tbody>
              {/* Keyed by index, not email — a valid row set can legitimately
                  contain the same email twice; that's what the intra-file
                  dedup step resolves later, so email isn't unique here. */}
              {valid.slice(0, PREVIEW_LIMIT).map((row, index) => (
                <tr key={index} className="border-b border-hairline last:border-0">
                  <td className="max-w-48 truncate py-2 pr-4 font-medium">{row.client_name}</td>
                  <td className="max-w-48 truncate py-2 pr-4 text-ink-muted">{row.email}</td>
                  <td className="max-w-48 truncate py-2 text-ink-muted">{row.company ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {valid.length === 0 && (
        <p className="mb-4 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
          No rows passed validation, so there&rsquo;s nothing to import. Fix the errors above and
          upload the file again.
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isImporting}
          className="rounded-md border border-hairline bg-canvas-pure px-3.5 py-1 text-sm font-medium text-ink-main shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onImport}
          disabled={isImporting || valid.length === 0}
          className="rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
        >
          {isImporting ? "Importing…" : `Import ${valid.length.toLocaleString()} leads`}
        </button>
      </div>
    </section>
  );
}
