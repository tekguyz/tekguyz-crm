import { PIPELINE_STATUSES, comparePipelinePriority } from "@/lib/leads/pipeline";
import type { Lead } from "@/lib/leads/queries";
import type { LeadSortKey, SortDir } from "@/lib/views/params";

// Sorting for the Contacts and Pipeline views (#47 step 9), as pure functions
// over an already-fetched array, run on the server page. The same reasoning as
// lib/prospects/sort.ts: the whole set is fetched to render the list anyway.
//
// A missing value sorts LAST in both directions. A lead with no amount is not
// the cheapest lead, and flipping the direction must never move the leads you
// cannot compare to the top.

type SortValue = string | number | null;

function valueOf(lead: Lead, key: Exclude<LeadSortKey, "priority">): SortValue {
  switch (key) {
    case "name":
      return lead.client_name ?? null;
    case "stage": {
      const index = PIPELINE_STATUSES.indexOf(lead.status as (typeof PIPELINE_STATUSES)[number]);
      return index === -1 ? null : index;
    }
    case "amount":
      return lead.estimated_revenue ?? null;
    case "due": {
      const time = lead.next_action_at ? Date.parse(lead.next_action_at) : NaN;
      return Number.isNaN(time) ? null : time;
    }
  }
}

function compareValues(left: string | number, right: string | number): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), undefined, { sensitivity: "base", numeric: true });
}

// Ties fall back to the name, A-Z in either direction, then the id, so the
// order is the same on every render.
function tieBreak(a: Lead, b: Lead): number {
  return compareValues(a.client_name ?? "", b.client_name ?? "") || a.id.localeCompare(b.id);
}

export function leadComparator(sort: LeadSortKey, dir: SortDir): (a: Lead, b: Lead) => number {
  if (sort === "priority") return comparePipelinePriority;
  // A const keeps the narrowing inside the closure below.
  const key: Exclude<LeadSortKey, "priority"> = sort;
  const sign = dir === "desc" ? -1 : 1;

  return (a, b) => {
    const left = valueOf(a, key);
    const right = valueOf(b, key);
    if (left === null || right === null) {
      if (left === right) return tieBreak(a, b);
      return left === null ? 1 : -1;
    }
    return compareValues(left, right) * sign || tieBreak(a, b);
  };
}

// A new array. The input may be the cache()'d query result that the @header
// slot also reads, so it is never sorted in place.
export function sortLeads(leads: readonly Lead[], sort: LeadSortKey, dir: SortDir): Lead[] {
  return [...leads].sort(leadComparator(sort, dir));
}
