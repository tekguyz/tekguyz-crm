"use client";

import { useMemo, useState } from "react";
import { batchInsertLeads, type BatchInsertResult } from "@/lib/actions/import-actions";
import { validateRows, type ValidationOutcome } from "@/lib/import/validate-rows";
import {
  guessMapping,
  type ColumnMapping,
  type ParsedCsvFile,
  type WizardStep,
} from "@/lib/types/csv-import";

const EMPTY_OUTCOME: ValidationOutcome = { valid: [], invalid: [] };

export function useImportWizard() {
  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<ParsedCsvFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [result, setResult] = useState<BatchInsertResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Recomputed from the parsed rows + current mapping rather than stored, so
  // changing a mapping and stepping forward can never show a stale verdict.
  const outcome = useMemo(
    () => (file ? validateRows(file.rows, mapping) : EMPTY_OUTCOME),
    [file, mapping],
  );

  function handleParsed(parsed: ParsedCsvFile) {
    setFile(parsed);
    setMapping(guessMapping(parsed.headers));
    setResult(null);
    setStep("map");
  }

  async function runImport() {
    setIsImporting(true);
    try {
      setResult(await batchInsertLeads(outcome.valid));
    } catch (err) {
      setResult({
        imported: 0,
        intraFileDuplicates: 0,
        existingDuplicates: 0,
        existingActive: 0,
        existingArchived: 0,
        rejectedServerSide: 0,
        failedChunks: 0,
        failedChunkRows: outcome.valid.length,
        error: err instanceof Error ? err.message : "The import failed to run.",
      });
    } finally {
      setIsImporting(false);
      setStep("summary");
    }
  }

  function reset() {
    setFile(null);
    setMapping({});
    setResult(null);
    setStep("upload");
  }

  return {
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
  };
}
