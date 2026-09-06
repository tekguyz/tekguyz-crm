"use client";

import { useMemo, useState } from "react";
import { IconArrowDown, IconArrowUp, IconArrowsSort } from "@tabler/icons-react";

import { ProspectRow } from "@/components/prospects/ProspectRow";
import { PromoteProspectModal } from "@/components/prospects/PromoteProspectModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableBody, TableHead, TableHeaderCell, TableRow } from "@/components/ui/TableRow";
import type { Prospect } from "@/lib/prospects/queries";
import { useArrivalHighlight } from "@/lib/hooks/use-arrival-highlight";
import { OPERATOR_PROSPECT_STATUSES, prospectStatusLabel } from "@/lib/prospects/statuses";
import {
  filterProspects,
  sortProspects,
  type ProspectSortKey,
  type SortDirection,
} from "@/lib/prospects/sort";

type Column = {
  key: ProspectSortKey | null;
  label: string;
  className?: string;
};

const COLUMNS: Column[] = [
  { key: "name", label: "Business" },
  { key: "city", label: "City" },
  { key: null, label: "Phone" },
  { key: "rating", label: "Rating" },
  { key: "status", label: "Status" },
  { key: null, label: "Notes" },
  { key: null, label: "", className: "text-right" },
];

// Sorting and filtering are client state over an already-fetched array, not
// URL state. Deliberate: this list is worked through while making calls, and a
// full server round trip per header click would lose scroll position in the
// middle of a call sheet. The archived/active split IS in the URL — that one
// changes which rows exist, so it is a different query, not a different view.
export function ProspectsTable({
  prospects,
  highlightProspectId = null,
}: {
  prospects: Prospect[];
  // Set only by the CMD+K palette's Prospects group, via ?highlight= on the
  // URL. Null for every other arrival at this page.
  highlightProspectId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sortKey, setSortKey] = useState<ProspectSortKey>("name");
  const [direction, setDirection] = useState<SortDirection>("asc");
  const [promoting, setPromoting] = useState<Prospect | null>(null);

  const visible = useMemo(
    () => sortProspects(filterProspects(prospects, { query, status }), sortKey, direction),
    [prospects, query, status, sortKey, direction],
  );

  // The same hook TasksSection uses, not a second copy of it. onArrive clears
  // the two client-side filters, for the same reason TasksSection switches its
  // Open/Completed tab first: a target the current filter excludes is not in
  // the DOM at all, so scrolling to it would silently find nothing — and this
  // page keeps its search box and status filter across a client-side
  // navigation, so a stale filter really can hide the row the user just picked.
  const highlightedId = useArrivalHighlight(highlightProspectId, prospects, () => {
    setQuery("");
    setStatus("ALL");
  });

  function toggleSort(key: ProspectSortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setDirection("asc");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <Input
            type="search"
            label="Search"
            placeholder="Name, city, category, phone, notes…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            {OPERATOR_PROSPECT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {prospectStatusLabel(value)}
              </option>
            ))}
            <option value="CONVERTED">Converted</option>
          </Select>
        </div>
        <p className="text-caption text-ink-muted pb-1.5" aria-live="polite">
          {visible.length} of {prospects.length}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="text-body-md text-ink-muted rounded-md border border-hairline px-3 py-8 text-center">
          No prospects match this view.
        </p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHeaderCell key={column.label} className={column.className}>
                  {column.key ? (
                    // A real <button>, so the header is reachable and operable
                    // from the keyboard and announces its own sort state.
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-ml-2"
                      aria-label={`Sort by ${column.label}`}
                      onClick={() => toggleSort(column.key as ProspectSortKey)}
                    >
                      {column.label}
                      <SortIcon active={sortKey === column.key} direction={direction} />
                    </Button>
                  ) : (
                    <span className={column.label ? undefined : "sr-only"}>
                      {column.label || "Actions"}
                    </span>
                  )}
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((prospect) => (
              <ProspectRow
                key={prospect.id}
                prospect={prospect}
                onPromote={setPromoting}
                highlighted={prospect.id === highlightedId}
              />
            ))}
          </TableBody>
        </Table>
      )}

      {/* One modal for the whole table, keyed by prospect so its form state and
          its action state reset between rows rather than leaking the previous
          prospect's error into the next one. */}
      {promoting ? (
        <PromoteProspectModal
          key={promoting.id}
          prospect={promoting}
          onClose={() => setPromoting(null)}
        />
      ) : null}
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) {
    return <IconArrowsSort className="size-3.5 opacity-50" stroke={1.75} aria-hidden="true" />;
  }
  return direction === "asc" ? (
    <IconArrowUp className="size-3.5" stroke={1.75} aria-hidden="true" />
  ) : (
    <IconArrowDown className="size-3.5" stroke={1.75} aria-hidden="true" />
  );
}
