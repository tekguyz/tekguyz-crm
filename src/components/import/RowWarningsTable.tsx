"use client";

import { IconAlertCircle } from "@tabler/icons-react";

import { IssuePanel, IssueRow } from "@/components/import/IssuePanel";
import { RowStatus } from "@/components/import/RowStatus";
import type { RowWarning } from "@/lib/import/validate-rows";

// Rows that import, but lost a junk cell on the way ("N/A" in a Facebook
// column, say). Shown on the review step and again on the summary, so the
// user can fix those links on the lead by hand.
//
// Still named a Table so its importers and the docs keep pointing at it; it is
// a panel of rows now (see IssuePanel).
export function RowWarningsTable({ warnings }: { warnings: RowWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <IssuePanel
      title="Rows with an emptied cell"
      icon={<IconAlertCircle aria-hidden="true" size={18} stroke={1.75} className="text-pill-orange-fg" />}
      description="These rows import, but a cell was not the right kind of link, so it was left empty."
      items={warnings.map((warning) => (
        <IssueRow
          key={warning.lineNumber}
          lineNumber={warning.lineNumber}
          name={warning.preview}
          status={<RowStatus kind="warning" />}
        >
          {warning.warnings.join(" · ")}
        </IssueRow>
      ))}
    />
  );
}
