"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { UploadCloud } from "lucide-react";
import {
  MAX_IMPORT_ROWS,
  type ParsedCsvFile,
  type ParsedCsvRow,
} from "@/lib/types/csv-import";

export function CsvUploadDropzone({ onParsed }: { onParsed: (file: ParsedCsvFile) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);

    // Cheapest guard against a binary/spreadsheet file dropped by mistake:
    // PapaParse will happily "parse" one into nonsense headers otherwise.
    if (!/\.csv$/i.test(file.name)) {
      setError("That doesn't look like a CSV file. Export your spreadsheet as .csv and try again.");
      return;
    }

    setParsing(true);
    Papa.parse<ParsedCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false);
        const headers = (results.meta.fields ?? []).filter((header) => header.trim() !== "");

        if (headers.length === 0) {
          setError("We couldn't read any column headers from this file. Check that the first row contains column names.");
          return;
        }
        if (results.data.length === 0) {
          setError("This file has column headers but no data rows. Add at least one lead and try again.");
          return;
        }
        // Hard gate, enforced before the mapping step is ever reachable — an
        // oversized file is rejected outright rather than silently truncated.
        if (results.data.length > MAX_IMPORT_ROWS) {
          setError(
            `This file has ${results.data.length.toLocaleString()} rows — imports are limited to ${MAX_IMPORT_ROWS.toLocaleString()} at a time. Split it and try again.`,
          );
          return;
        }

        onParsed({ fileName: file.name, headers, rows: results.data });
      },
      error: () => {
        setParsing(false);
        setError("We couldn't read this file. Make sure it's a comma-separated CSV and try again.");
      },
    });
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={`rounded-lg border border-dashed bg-canvas-pure px-6 py-12 text-center transition-colors ${
          dragging ? "border-accent bg-canvas-soft" : "border-hairline"
        }`}
      >
        <UploadCloud className="mx-auto mb-3 size-8 text-ink-muted" />
        <p className="mb-1 text-sm font-medium">
          {parsing ? "Reading your file…" : "Drop a CSV file here"}
        </p>
        <p className="mb-4 text-xs text-ink-muted">
          Up to {MAX_IMPORT_ROWS.toLocaleString()} rows per import. The first row should be your
          column headers.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={parsing}
          className="rounded-md border border-hairline bg-canvas-pure px-3.5 py-1 text-sm font-medium text-ink-main shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
        >
          Choose a file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            // Lets the same file be re-picked after a rejection.
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="mt-3 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
          {error}
        </p>
      )}
    </div>
  );
}
