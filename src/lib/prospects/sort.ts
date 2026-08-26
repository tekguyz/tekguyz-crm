import type { Prospect } from "@/lib/prospects/queries";

// Sorting and text filtering for the /prospects table, as pure functions over
// an already-fetched array.
//
// In JS rather than PostgREST on purpose: a tenant holds low hundreds of
// prospects (122 in TEKGUYZ today), the whole set is already fetched to render
// the table, and a round trip per column-header click would be slower and
// would lose the current scroll position for no measurable gain. The same
// reasoning /reports used for its aggregation.

// Exactly the four columns that render a sortable header on /prospects, and no
// more. review_count and created_at are both plausible sorts and both have no
// header today — a key with no live consumer is scope creep, same rule as a
// primitive with no caller.
export const PROSPECT_SORT_KEYS = ["name", "city", "status", "rating"] as const;

export type ProspectSortKey = (typeof PROSPECT_SORT_KEYS)[number];
export type SortDirection = "asc" | "desc";

export function isProspectSortKey(value: string | undefined): value is ProspectSortKey {
  return PROSPECT_SORT_KEYS.includes(value as ProspectSortKey);
}

// NULL sorts LAST in both directions, deliberately — not "last in asc, first in
// desc". A prospect with no rating is not a prospect with the worst rating, and
// flipping the direction should reorder the businesses you can compare, never
// promote the ones you cannot to the top of the list.
function compare(a: Prospect, b: Prospect, key: ProspectSortKey): number {
  const left = a[key];
  const right = b[key];

  if (left === null || left === undefined) return right === null || right === undefined ? 0 : 1;
  if (right === null || right === undefined) return -1;

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  // localeCompare so "Ávila" sorts next to "Avila" rather than after "Zebra",
  // and numeric:true so "Suite 10" follows "Suite 9".
  return String(left).localeCompare(String(right), undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

export function sortProspects(
  rows: Prospect[],
  key: ProspectSortKey,
  direction: SortDirection,
): Prospect[] {
  const sorted = [...rows].sort((a, b) => compare(a, b, key));

  if (direction === "desc") {
    // Reversing after a null-last sort would put nulls first, undoing the rule
    // above. Partition instead: flip only the comparable rows.
    const nulls = sorted.filter((row) => row[key] === null || row[key] === undefined);
    const values = sorted.filter((row) => row[key] !== null && row[key] !== undefined);
    return [...values.reverse(), ...nulls];
  }

  return sorted;
}

export type ProspectFilter = {
  query?: string;
  status?: string;
};

// Substring match across the fields an operator actually recognises a business
// by while holding a phone: its name, its town, its category, and the number
// itself. Not a fuzzy search — Fuse.js is already in this project for the
// command palette, but a table filter that silently returns near-misses makes
// "no results" untrustworthy, which is the one answer this list has to be
// right about before you stop calling.
export function filterProspects(rows: Prospect[], filter: ProspectFilter): Prospect[] {
  const query = filter.query?.trim().toLowerCase() ?? "";
  const status = filter.status && filter.status !== "ALL" ? filter.status : null;

  return rows.filter((row) => {
    if (status && row.status !== status) return false;
    if (!query) return true;

    return [row.name, row.city, row.category, row.phone, row.notes]
      .filter((field): field is string => Boolean(field))
      .some((field) => field.toLowerCase().includes(query));
  });
}
