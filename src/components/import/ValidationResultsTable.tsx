"use client";

import { IconAlertCircle, IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";

import type { ValidationOutcome } from "@/lib/import/validate-rows";
import { IssuePanel, IssueRow } from "@/components/import/IssuePanel";
import { RowStatus } from "@/components/import/RowStatus";
import { RowWarningsTable } from "@/components/import/RowWarningsTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const PREVIEW_LIMIT = 5;
const CHIP_ICON = { "aria-hidden": true, size: 12, stroke: 2 } as const;

// The step is a plain <section>, not a bordered card: the panels inside it are
// the surfaces, so a card around them would nest one in another. Still a real
// landmark for the wizard step, as ColumnMappingTable is.
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
  const { valid, invalid, warnings } = outcome;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-h2 mb-1">Review your rows</h2>
        <p className="text-body-sm text-ink-muted">
          Rows that fail validation are skipped — the rest still import.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="green" className="rounded-full px-2">
          <IconCircleCheck {...CHIP_ICON} />
          {valid.length.toLocaleString()} ready
        </Badge>
        {invalid.length > 0 && (
          <Badge tone="pink" className="rounded-full px-2">
            <IconAlertTriangle {...CHIP_ICON} />
            {invalid.length.toLocaleString()} with errors
          </Badge>
        )}
        {warnings.length > 0 && (
          <Badge tone="orange" className="rounded-full px-2">
            <IconAlertCircle {...CHIP_ICON} />
            {warnings.length.toLocaleString()} with an emptied cell
          </Badge>
        )}
      </div>

      {invalid.length > 0 && (
        <IssuePanel
          title="Rows with errors"
          icon={<IconAlertTriangle aria-hidden="true" size={18} stroke={1.75} className="text-pill-pink-fg" />}
          description="These rows are skipped. Fix them in your file and upload it again."
          items={invalid.map((failure) => (
            <IssueRow
              key={failure.lineNumber}
              lineNumber={failure.lineNumber}
              name={failure.preview}
              status={<RowStatus kind="error" />}
            >
              {failure.errors.join(" · ")}
            </IssueRow>
          ))}
        />
      )}

      <RowWarningsTable warnings={warnings} />

      {valid.length > 0 && (
        <IssuePanel
          title="Ready to import"
          icon={<IconCircleCheck aria-hidden="true" size={18} stroke={1.75} className="text-pill-green-fg" />}
          count={valid.length}
          expandable={false}
          footnote={
            valid.length > PREVIEW_LIMIT
              ? `Showing the first ${PREVIEW_LIMIT} of ${valid.length.toLocaleString()}.`
              : undefined
          }
          // Keyed by index: a valid row set can legitimately contain the same
          // business twice; the import RPC resolves that later, so no field is
          // unique here.
          items={valid.slice(0, PREVIEW_LIMIT).map((row, index) => (
            <IssueRow key={index} name={row.client_name}>
              {[row.email ?? row.phone, row.company].filter(Boolean).join(" · ") || "—"}
            </IssueRow>
          ))}
        />
      )}

      {valid.length === 0 && (
        <p className="text-body-md rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
          No rows passed validation, so there&rsquo;s nothing to import. Fix the errors above and
          upload the file again.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="max-sm:h-11"
          onClick={onBack}
          disabled={isImporting}
        >
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          className="max-sm:h-11"
          onClick={onImport}
          disabled={isImporting || valid.length === 0}
        >
          {isImporting ? "Importing…" : `Import ${valid.length.toLocaleString()} leads`}
        </Button>
      </div>
    </section>
  );
}
