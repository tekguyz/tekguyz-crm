"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  IconAlertTriangle,
  IconArchive,
  IconArchiveOff,
  IconBrandGoogleMaps,
  IconPhone,
} from "@tabler/icons-react";

import {
  ProspectStatusBadge,
  prospectStatusTone,
} from "@/components/prospects/ProspectStatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { BADGE_TONE_CLASSES } from "@/components/ui/Badge";
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
import { cn } from "@/lib/utils/cn";
import { OPERATOR_PROSPECT_STATUSES, prospectStatusLabel } from "@/lib/prospects/statuses";

export type ProspectColumnId =
  "name" | "city" | "phone" | "rating" | "status" | "notes" | "actions";

const DEFAULT_COLUMN_ORDER: readonly ProspectColumnId[] = [
  "name",
  "city",
  "phone",
  "rating",
  "status",
  "notes",
  "actions",
];

export function ProspectRow({
  prospect,
  columnOrder = DEFAULT_COLUMN_ORDER,
  onPromote,
  highlighted = false,
}: {
  prospect: Prospect;
  // The header's current column order, owned by ProspectsTable's
  // useColumnLayout. Each cell is built once below and placed by this list, so
  // a reordered header and its body cells can never disagree.
  columnOrder?: readonly ProspectColumnId[];
  onPromote: (prospect: Prospect) => void;
  // True for the one row the command palette navigated to, for a couple of
  // seconds after arrival. ProspectsTable owns the timer and the filter reset;
  // this only renders the marker and scrolls itself into view. Same split
  // TaskRow / TasksSection use.
  highlighted?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const rowRef = useRef<HTMLTableRowElement>(null);

  // The row brings itself into view rather than an ancestor reaching in to move
  // it — the same recipe TaskRow and OptionRow use. `block: "nearest"` scrolls
  // the shell's <main> only as far as it must.
  useEffect(() => {
    if (highlighted) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

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

  const cells: Record<ProspectColumnId, ReactNode> = {
    name: (
      <TableCell className="max-sm:order-1 max-sm:p-0 min-w-0">
        <div className="flex items-center gap-3">
          <Avatar name={prospect.name} size="sm" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-1">
              <span className="text-body-md font-medium">{prospect.name}</span>
              {/* The scraped GBP listing, which is how the operator checks a
                business before ringing it. Icon-only and inline beside the
                name rather than its own column: this table is already seven
                columns wide, and a column would cost horizontal room on every
                row to carry one link. New tab, because losing the call list
                mid-call is worse than a stray tab. */}
              {prospect.google_maps_url ? (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="-my-1 shrink-0 px-1 max-sm:-my-3 max-sm:size-11"
                >
                  <a
                    href={prospect.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Open ${prospect.name} in Google Maps`}
                  >
                    <IconBrandGoogleMaps className="size-4" stroke={1.75} aria-hidden="true" />
                    <span className="sr-only">Open {prospect.name} in Google Maps</span>
                  </a>
                </Button>
              ) : null}
            </span>
            <span className="text-body-sm text-ink-muted">{prospect.category ?? "—"}</span>
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
        </div>
      </TableCell>
    ),
    city: (
      <TableCell className="whitespace-nowrap max-sm:order-5 max-sm:p-0">
        <span className="text-body-sm">{prospect.city ?? "—"}</span>
      </TableCell>
    ),
    phone: (
      <TableCell className="max-sm:order-3 max-sm:p-0">
        {/* CLAUDE.md's click-to-action rule: a number on screen is a number you
            can ring from the device you are holding. */}
        {prospect.phone ? (
          <Button asChild variant="ghost" size="sm" className="-ml-2 whitespace-nowrap max-sm:h-11">
            <a href={`tel:${prospect.phone.replace(/[^0-9+]/g, "")}`}>
              <IconPhone className="size-4" stroke={1.75} aria-hidden="true" />
              {prospect.phone}
            </a>
          </Button>
        ) : (
          <span className="text-body-sm text-ink-muted">No number</span>
        )}
      </TableCell>
    ),
    rating: (
      <TableCell className="whitespace-nowrap max-sm:order-6 max-sm:p-0 max-sm:text-right">
        {prospect.rating !== null ? (
          <span className="text-body-sm">
            {prospect.rating.toFixed(1)}
            <span className="text-ink-muted"> ({prospect.review_count ?? 0})</span>
          </span>
        ) : (
          <span className="text-body-sm text-ink-muted">—</span>
        )}
      </TableCell>
    ),
    status: (
      <TableCell className="max-sm:order-2 max-sm:min-w-36 max-sm:p-0">
        {promoted ? (
          <ProspectStatusBadge status={prospect.status} />
        ) : (
          <Select
            aria-label={`Status for ${prospect.name}`}
            defaultValue={prospect.status}
            disabled={isPending}
            // The select IS the status pill: same tone classes as Badge, so a
            // call sheet can be scanned by colour. NOT_INTERESTED stays the
            // quiet neutral pill (see ProspectStatusBadge).
            className={cn(
              "rounded-sm border-transparent font-medium max-sm:h-11",
              BADGE_TONE_CLASSES[prospectStatusTone(prospect.status)],
            )}
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
    ),
    // min-w-56 floors this column only under auto layout. Once a header is
    // resized the table switches to fixed layout and the column's own
    // minWidth in ProspectsTable is the floor instead.
    notes: (
      <TableCell className="min-w-56 max-sm:order-7 max-sm:col-span-2 max-sm:min-w-0 max-sm:p-0">
        {/* Saves on blur rather than behind an edit button: this is what gets
            typed one-handed between calls, and a second click to commit is a
            note that never gets written. */}
        <Input
          aria-label={`Notes for ${prospect.name}`}
          defaultValue={prospect.notes ?? ""}
          placeholder="Call notes…"
          disabled={isPending}
          className="max-sm:h-11"
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
    ),
    actions: (
      <TableCell className="max-sm:order-4 max-sm:p-0">
        <div className="flex items-center justify-end gap-1">
          {promoted ? (
            <Button asChild variant="ghost" size="sm" className="max-sm:h-11">
              <Link href={`/prospects?leadId=${prospect.promoted_lead_id}`}>View lead</Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="max-sm:h-11"
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
            className="max-sm:size-11"
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
    ),
  };

  return (
    // The arrival marker is TaskRow's idiom, not new visual language: an
    // --accent bar down the leading edge over a --canvas-soft tint. Drawn as an
    // inset box-shadow on the first cell rather than a border or a
    // pseudo-element, because a <tr> is a poor containing block and a real
    // border would shift every cell in the row by its own width. `first-child`
    // is whichever column is currently leftmost, which is still the leading edge.
    <TableRow
      ref={rowRef}
      className={cn(
        "transition-colors",
        // Below sm the row is a two-column grid, not table cells: identity and
        // status, then phone and actions, then city and rating, then notes.
        // Each cell carries its own `order`, so a header reorder on desktop
        // cannot scramble the phone layout.
        "max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-1 max-sm:px-3 max-sm:py-2",
        highlighted && "bg-canvas-soft [&>td:first-child]:shadow-[inset_2px_0_0_var(--accent)]",
      )}
      data-highlighted={highlighted ? "true" : undefined}
    >
      {columnOrder.map((id) => (
        <Fragment key={id}>{cells[id]}</Fragment>
      ))}
    </TableRow>
  );
}
