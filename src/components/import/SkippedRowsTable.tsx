"use client";

import Link from "next/link";
import { IconAlertTriangle } from "@tabler/icons-react";

import { IssuePanel, IssueRow } from "@/components/import/IssuePanel";
import { RowStatus } from "@/components/import/RowStatus";
import type { SkippedRow } from "@/lib/import/insert-chunks";
import type { RowLabel } from "@/lib/import/validate-rows";

// The RPC's reject codes, plus the Server Action's own re-check, in words.
const REJECT_REASON: Record<string, string> = {
  NO_NAME: "No name",
  NO_CONTACT_CHANNEL: "No contact channel",
  SERVER_RECHECK: "Refused by the server re-check",
};

const linkClass = "text-accent underline underline-offset-2";

function Why({ row, labels }: { row: SkippedRow; labels: RowLabel[] }) {
  if (row.kind === "IN_FILE") {
    return <>Same business as row {labels[row.firstIndex]?.lineNumber ?? "?"}</>;
  }
  if (row.kind === "EXISTING") {
    // The app-wide ?leadId= deep link opens the matched lead's profile.
    return (
      <Link href={`/?leadId=${row.leadId}`} className={linkClass}>
        {row.archived ? "Already in the CRM, archived" : "Already in the CRM"}
      </Link>
    );
  }
  return <>{REJECT_REASON[row.reason] ?? "Refused"}</>;
}

// Every row that did not import, by its spreadsheet row, and why (#37). A
// duplicate names the lead it matched, so the user can open it. A duplicate is
// an orange no-op; a refusal is pink, like a failed validation.
//
// Still named a Table so its importers and the docs keep pointing at it; it is
// a panel of rows now (see IssuePanel).
export function SkippedRowsTable({ skipped, labels }: { skipped: SkippedRow[]; labels: RowLabel[] }) {
  if (skipped.length === 0) return null;

  return (
    <IssuePanel
      title="Rows not imported"
      icon={<IconAlertTriangle aria-hidden="true" size={18} stroke={1.75} className="text-pill-orange-fg" />}
      items={skipped.map((row) => (
        <IssueRow
          key={row.index}
          lineNumber={labels[row.index]?.lineNumber ?? "?"}
          name={labels[row.index]?.preview ?? "Unnamed row"}
          status={<RowStatus kind={row.kind === "REJECTED" ? "refused" : "duplicate"} />}
        >
          <Why row={row} labels={labels} />
        </IssueRow>
      ))}
    />
  );
}
