"use client";

import { CsvUploadDropzone } from "@/components/import/CsvUploadDropzone";
import { ColumnMappingTable } from "@/components/import/ColumnMappingTable";
import { ValidationResultsTable } from "@/components/import/ValidationResultsTable";
import { ImportSummary } from "@/components/import/ImportSummary";
import { useImportWizard } from "@/components/import/useImportWizard";
import type { WizardStep } from "@/lib/types/csv-import";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "map", label: "Match columns" },
  { id: "validate", label: "Review" },
  { id: "summary", label: "Done" },
];

export function ImportWizardLayout() {
  const {
    step,
    setStep,
    file,
    mapping,
    setMapping,
    outcome,
    result,
    isImporting,
    handleParsed,
    runImport,
    reset,
  } = useImportWizard();

  const activeIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Import leads</h1>
        <p className="text-sm text-ink-muted">
          Bring an existing list of leads in from a spreadsheet.
        </p>
      </div>

      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {STEPS.map((s, index) => (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={
                index === activeIndex
                  ? "font-medium text-accent"
                  : index < activeIndex
                    ? "text-ink-main"
                    : "text-ink-muted"
              }
            >
              {s.label}
            </span>
            {index < STEPS.length - 1 && <span className="text-ink-muted">/</span>}
          </li>
        ))}
      </ol>

      {step === "upload" && (
        <>
          {/* Parsed rows are kept when stepping back, so returning here offers
              the loaded file rather than silently discarding it. */}
          {file && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-canvas-pure p-3 shadow-elevation-1">
              <p className="text-sm">
                <span className="font-medium">{file.fileName}</span>
                <span className="text-ink-muted"> · {file.rows.length.toLocaleString()} rows loaded</span>
              </p>
              <button
                type="button"
                onClick={() => setStep("map")}
                className="rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
              >
                Continue with this file
              </button>
            </div>
          )}
          <CsvUploadDropzone onParsed={handleParsed} />
        </>
      )}

      {step === "map" && file && (
        <ColumnMappingTable
          file={file}
          mapping={mapping}
          onChange={setMapping}
          onBack={() => setStep("upload")}
          onContinue={() => setStep("validate")}
        />
      )}

      {step === "validate" && file && (
        <ValidationResultsTable
          outcome={outcome}
          onBack={() => setStep("map")}
          onImport={runImport}
          isImporting={isImporting}
        />
      )}

      {step === "summary" && result && (
        <ImportSummary
          result={result}
          failedValidation={outcome.invalid.length}
          onImportAnother={reset}
        />
      )}
    </div>
  );
}
