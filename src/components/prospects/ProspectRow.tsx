"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { IconAlertTriangle, IconArchive, IconArchiveOff, IconPhone } from "@tabler/icons-react";

import { ProspectStatusBadge } from "@/components/prospects/ProspectStatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TableCell, TableRow } from "@/components/ui/TableRow";
import {
  setProspectArchived,
  setProspectNotes,
  setProspectStatus,
} from "@/lib/actions/prospect-actions";
import type { Prospect } from "@/lib/prospects/queries";
import { OPERATOR_PROSPECT_STATUSES, prospectStatusLabel } from "@/lib/prospects/statuses";

export function ProspectRow({
  prospect,
  onPromote,
}: {
  prospect: Prospect;
  onPromote: (prospect: Prospect) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // promoted_lead_id, never status === "CONVERTED". The status string is a
  // label an operator can set by hand and cannot carry the lead's identity;
  // this column is written only by the promotion path's guarded UPDATE.
  const promoted = prospect.promoted_lead_id !== null;

  function run(action: () => Promise<{ error?: string } | null>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <TableRow className="align-top">
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="text-body-md font-medium">{prospect.name}</span>
          <span className="text-caption text-ink-muted">{prospect.category ?? "—"}</span>
          {prospect.possible_duplicate_lead_id ? (
            // Informational, never a block. A shared switchboard number is an
            // ordinary reason for a phone match, so this points the operator at
            // the lead to check and stops there — Promote stays enabled.
            <Link
              href={`/prospects?leadId=${prospect.possible_duplicate_lead_id}`}
              className="text-caption inline-flex items-center gap-1 text-ink-muted underline underline-offset-2"
            >
              <IconAlertTriangle className="size-3.5" stroke={1.75} aria-hidden="true" />
              Phone matches an existing lead
            </Link>
          ) : null}
        </div>
      </TableCell>

      <TableCell className="whitespace-nowrap">
        <span className="text-body-sm">{prospect.city ?? "—"}</span>
      </TableCell>

      <TableCell>
        {/* CLAUDE.md's click-to-action rule: a number on screen is a number you
            can ring from the device you are holding. */}
        {prospect.phone ? (
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <a href={`tel:${prospect.phone.replace(/[^0-9+]/g, "")}`}>
              <IconPhone className="size-4" stroke={1.75} aria-hidden="true" />
              {prospect.phone}
            </a>
          </Button>
        ) : (
          <span className="text-body-sm text-ink-muted">No number</span>
        )}
      </TableCell>

      <TableCell className="whitespace-nowrap">
        {prospect.rating !== null ? (
          <span className="text-body-sm">
            {prospect.rating.toFixed(1)}
            <span className="text-ink-muted"> ({prospect.review_count ?? 0})</span>
          </span>
        ) : (
          <span className="text-body-sm text-ink-muted">—</span>
        )}
      </TableCell>

      <TableCell>
        {promoted ? (
          <ProspectStatusBadge status={prospect.status} />
        ) : (
          <Select
            aria-label={`Status for ${prospect.name}`}
            defaultValue={prospect.status}
            disabled={isPending}
            onChange={(event) => run(() => setProspectStatus(prospect.id, event.target.value))}
          >
            {OPERATOR_PROSPECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {prospectStatusLabel(status)}
              </option>
            ))}
          </Select>
        )}
      </TableCell>

      <TableCell className="min-w-56">
        {/* Saves on blur rather than behind an edit button: this is what gets
            typed one-handed between calls, and a second click to commit is a
            note that never gets written. */}
        <Input
          aria-label={`Notes for ${prospect.name}`}
          defaultValue={prospect.notes ?? ""}
          placeholder="Call notes…"
          disabled={isPending}
          onBlur={(event) => {
            if (event.target.value.trim() === (prospect.notes ?? "")) return;
            run(() => setProspectNotes(prospect.id, event.target.value));
          }}
        />
        {error ? (
          <p role="alert" className="text-caption mt-1 text-danger">
            {error}
          </p>
        ) : null}
      </TableCell>

      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {promoted ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/prospects?leadId=${prospect.promoted_lead_id}`}>View lead</Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isPending}
              onClick={() => onPromote(prospect)}
            >
              Promote
            </Button>
          )}

          {/* archived is the retirement lever, and the only one — prospects has
              no DELETE grant and no DELETE policy at all. */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            title={prospect.archived ? "Restore" : "Archive"}
            onClick={() => run(() => setProspectArchived(prospect.id, !prospect.archived))}
          >
            {prospect.archived ? (
              <IconArchiveOff className="size-4" stroke={1.75} aria-hidden="true" />
            ) : (
              <IconArchive className="size-4" stroke={1.75} aria-hidden="true" />
            )}
            <span className="sr-only">
              {prospect.archived ? `Restore ${prospect.name}` : `Archive ${prospect.name}`}
            </span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
