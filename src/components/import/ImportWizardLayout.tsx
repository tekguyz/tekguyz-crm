"use client";

import { CsvUploadDropzone } from "@/components/import/CsvUploadDropzone";
import { ColumnMappingTable } from "@/components/import/ColumnMappingTable";
import { ValidationResultsTable } from "@/components/import/ValidationResultsTable";
import { ImportSummary } from "@/components/import/ImportSummary";
import { useImportWizard } from "@/components/import/useImportWizard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
        <h1 className="text-h1">Import leads</h1>
        <p className="text-body-md text-ink-muted">
          Bring an existing list of leads in from a spreadsheet.
        </p>
      </div>

      <ol className="text-body-sm flex flex-wrap items-center gap-x-2 gap-y-1">
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
            <Card className="flex flex-wrap items-center justify-between gap-2 p-3">
              <p className="text-body-md">
                <span className="font-medium">{file.fileName}</span>
                <span className="text-ink-muted">
                  {" "}
                  · {file.rows.length.toLocaleString()} rows loaded
                </span>
              </p>
              <Button type="button" variant="primary" onClick={() => setStep("map")}>
                Continue with this file
              </Button>
            </Card>
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
