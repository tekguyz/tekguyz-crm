// src/components/views/ViewBar.tsx
"use client";

import { useRouter } from "next/navigation";
import { IconArrowsSort, IconDownload, IconFilter } from "@tabler/icons-react";

import { FilterTabs } from "@/components/leads/FilterTabs";
import { StageBadge } from "@/components/leads/StageBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PIPELINE_STATUSES } from "@/lib/leads/pipeline";
import {
  SORT_LABELS,
  filterCount,
  resetFiltersHref,
  sortKeysFor,
  toggleStageHref,
  viewHref,
  viewName,
  type LeadSortKey,
  type LeadView,
  type SortDir,
  type ViewPage,
} from "@/lib/views/params";

// The strip above a lead list, under the page header (#47 step 9, Twenty
// style). Left: the view's name, built from its filters, and on Pipeline the
// Board / Table switch (lg and up). Right: Filter, Sort, and on Contacts
// Export CSV. The record count stays in the page header: one number on screen.
//
// The URL is the only view state. Every menu row navigates to an href built by
// lib/views/params.ts; a Radix radio or checkbox row cannot also be an <a>,
// and those roles are what tell a screen reader which filter is on.
//
// Below lg, Filter, Sort and Export are 44px icon buttons; their words stay as
// the accessible names.

const MENU_LABEL = "text-label text-ink-muted";
const BAR_BUTTON = "max-lg:h-11 max-lg:min-w-11 max-lg:justify-center";

export function ViewBar({ page, view }: { page: ViewPage; view: LeadView }) {
  const router = useRouter();
  const go = (href: string) => router.push(href, { scroll: false });
  const count = filterCount(page, view);
  const name = viewName(page, view);

  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <h2 className="text-title min-w-0 truncate" title={name}>
          {name}
        </h2>
        {page === "pipeline" ? (
          <div className="hidden shrink-0 lg:block">
            <FilterTabs
              label="Layout"
              tabs={[
                { label: "Board", href: viewHref(page, view, { layout: "board" }), active: view.layout === "board" },
                { label: "Table", href: viewHref(page, view, { layout: "table" }), active: view.layout === "table" },
              ]}
            />
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              aria-label={count > 0 ? `Filter, ${count} active` : "Filter"}
              className={BAR_BUTTON}
            >
              <IconFilter size={16} stroke={1.5} aria-hidden="true" />
              <span className="max-lg:sr-only">Filter</span>
              {count > 0 ? (
                <Badge tone="sky" className="tabular-nums">
                  {count}
                </Badge>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {page === "contacts" ? (
              <>
                <DropdownMenuLabel className={MENU_LABEL}>Status</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={view.archived ? "archived" : "active"}
                  onValueChange={(value) => go(viewHref(page, view, { archived: value === "archived" }))}
                >
                  <DropdownMenuRadioItem value="active">Active</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="archived">Archived</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
              </>
            ) : null}

            <DropdownMenuLabel className={MENU_LABEL}>Owner</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={view.mine ? "mine" : "all"}
              onValueChange={(value) => go(viewHref(page, view, { mine: value === "mine" }))}
            >
              <DropdownMenuRadioItem value="all">All leads</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="mine">My leads</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />

            {/* None ticked means every stage. A tick keeps the menu open, so
                several stages can be picked in one visit. */}
            <DropdownMenuLabel className={MENU_LABEL}>Stage</DropdownMenuLabel>
            {PIPELINE_STATUSES.map((stage) => (
              <DropdownMenuCheckboxItem
                key={stage}
                checked={view.stages.includes(stage)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={() => go(toggleStageHref(page, view, stage))}
              >
                <StageBadge status={stage} />
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />

            <DropdownMenuItem disabled={count === 0} onSelect={() => go(resetFiltersHref(page, view))}>
              Reset filters
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" aria-label="Sort" className={BAR_BUTTON}>
              <IconArrowsSort size={16} stroke={1.5} aria-hidden="true" />
              <span className="max-lg:sr-only">Sort</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className={MENU_LABEL}>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={view.sort}
              onValueChange={(value) => go(viewHref(page, view, { sort: value as LeadSortKey, dir: "asc" }))}
            >
              {sortKeysFor(page).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            {/* Priority is one fixed order (overdue, starred, revenue, due),
                so it has no direction. */}
            <DropdownMenuRadioGroup
              value={view.dir}
              onValueChange={(value) => go(viewHref(page, view, { dir: value as SortDir }))}
            >
              <DropdownMenuRadioItem value="asc" disabled={view.sort === "priority"}>
                Ascending
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc" disabled={view.sort === "priority"}>
                Descending
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {page === "contacts" ? (
          // A plain <a>, not a Link: this navigates to a file download, and
          // next/link would try to client-navigate a route that returns CSV.
          // `download` is a hint only — the route's own Content-Disposition
          // names the file. The export is the whole directory, so it ignores
          // the filters: a backup that silently omitted the rows you had
          // filtered out would be wrong in the one way an export must not be.
          <Button asChild size="sm" variant="secondary" className={BAR_BUTTON}>
            <a href="/api/leads/export" download title="Exports every contact, whatever the filters">
              <IconDownload size={16} stroke={1.5} aria-hidden="true" />
              <span className="max-lg:sr-only">Export CSV</span>
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
