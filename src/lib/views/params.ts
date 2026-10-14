import {
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  type PipelineStatus,
} from "@/lib/leads/pipeline";

// THE ONE PLACE a lead list's view state is read from and written to the URL
// (#47 step 9). The URL is the only view state: Contacts and Pipeline, their
// @header slots and the view bar all parse with parseView and build with
// viewHref, so the header count, the list and the menus can never disagree
// about which view is on screen.
//
// Pure, no directive: server pages, @header slots and client components all
// import it.

export type ViewPage = "contacts" | "pipeline";
export type LeadSortKey = "name" | "stage" | "amount" | "due" | "priority";
export type SortDir = "asc" | "desc";
export type ViewLayout = "board" | "table";

export type LeadView = {
  // Contacts only. Pipeline is always the live, open leads.
  archived: boolean;
  mine: boolean;
  // Normalised: known values only, deduped, in pipeline order. Empty = all.
  stages: PipelineStatus[];
  sort: LeadSortKey;
  // Ignored (always "asc") when sort is "priority", which has no direction.
  dir: SortDir;
  // Pipeline only, and only at lg and up.
  layout: ViewLayout;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const PATHS: Record<ViewPage, string> = { contacts: "/contacts", pipeline: "/pipeline" };

export const SORT_LABELS: Record<LeadSortKey, string> = {
  priority: "Priority",
  name: "Name",
  stage: "Stage",
  amount: "Amount",
  due: "Next action",
};

export function sortKeysFor(page: ViewPage): LeadSortKey[] {
  return page === "pipeline"
    ? ["priority", "name", "stage", "amount", "due"]
    : ["name", "stage", "amount", "due"];
}

export function defaultView(page: ViewPage): LeadView {
  return {
    archived: false,
    mine: false,
    stages: [],
    sort: page === "pipeline" ? "priority" : "name",
    dir: "asc",
    layout: "board",
  };
}

// Next hands a repeated param over as an array. The first one wins.
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normaliseStages(values: readonly string[]): PipelineStatus[] {
  const wanted = new Set(values);
  return PIPELINE_STATUSES.filter((status) => wanted.has(status));
}

// The stage filter as cache()'s key. A string, never an array: cache() keys
// by argument identity, so an array would give the @header slot and the page
// two separate queries, and the count could drift from the list.
export function stagesKey(stages: readonly PipelineStatus[]): string {
  return normaliseStages(stages).join(",");
}

// Never throws. An unknown or bad value falls back to the default.
export function parseView(page: ViewPage, raw: RawSearchParams): LeadView {
  const view = defaultView(page);

  if (page === "contacts" && first(raw.archived) === "true") view.archived = true;
  if (first(raw.mine) === "true") view.mine = true;

  const stage = first(raw.stage);
  if (stage) view.stages = normaliseStages(stage.split(","));

  const sort = first(raw.sort);
  if (sort && (sortKeysFor(page) as string[]).includes(sort)) view.sort = sort as LeadSortKey;
  if (view.sort !== "priority" && first(raw.dir) === "desc") view.dir = "desc";

  if (page === "pipeline" && first(raw.view) === "table") view.layout = "table";

  return view;
}

// Changes what `change` names and keeps the rest. A default is omitted, so
// the default view's URL is the bare path. Built by hand rather than with
// URLSearchParams so the stage list keeps plain commas: every value here is a
// fixed ASCII token, so there is nothing to encode.
export function viewHref(page: ViewPage, view: LeadView, change: Partial<LeadView> = {}): string {
  const next = { ...view, ...change };
  const base = defaultView(page);
  const parts: string[] = [];

  if (page === "contacts" && next.archived) parts.push("archived=true");
  if (next.mine) parts.push("mine=true");
  const stages = stagesKey(next.stages);
  if (stages) parts.push(`stage=${stages}`);
  if (next.sort !== base.sort) parts.push(`sort=${next.sort}`);
  if (next.sort !== "priority" && next.dir === "desc") parts.push("dir=desc");
  if (page === "pipeline" && next.layout === "table") parts.push("view=table");

  return parts.length ? `${PATHS[page]}?${parts.join("&")}` : PATHS[page];
}

// A table header click: the active sort flips, any other sort starts asc.
export function headerSortHref(page: ViewPage, view: LeadView, key: LeadSortKey): string {
  const dir: SortDir = view.sort === key && view.dir === "asc" ? "desc" : "asc";
  return viewHref(page, view, { sort: key, dir });
}

export function toggleStageHref(page: ViewPage, view: LeadView, stage: PipelineStatus): string {
  const stages = view.stages.includes(stage)
    ? view.stages.filter((s) => s !== stage)
    : [...view.stages, stage];
  return viewHref(page, view, { stages });
}

// One per filter group that is not at its default: Status, Owner, Stage.
export function filterCount(page: ViewPage, view: LeadView): number {
  return (
    (page === "contacts" && view.archived ? 1 : 0) +
    (view.mine ? 1 : 0) +
    (view.stages.length > 0 ? 1 : 0)
  );
}

export function resetFiltersHref(page: ViewPage, view: LeadView): string {
  return viewHref(page, view, { archived: false, mine: false, stages: [] });
}

// "Active leads", "Archived · My leads", "Open leads · Quoted, Active".
export function viewName(page: ViewPage, view: LeadView): string {
  const scope = page === "pipeline" ? "Open" : view.archived ? "Archived" : "Active";
  const owner = view.mine ? `${scope} · My leads` : `${scope} leads`;
  if (view.stages.length === 0) return owner;
  return `${owner} · ${view.stages.map((stage) => PIPELINE_STATUS_LABELS[stage]).join(", ")}`;
}

// The board and the Focus List seed useState from their leads, so they must
// remount whenever the FETCHED set changes (owner, stage). Sort and layout do
// not change the fetched set and must not remount them.
export function boardKey(view: LeadView): string {
  return `${view.mine ? "mine" : "all"}|${stagesKey(view.stages) || "all"}`;
}
