import { describe, expect, it } from "vitest";

import {
  boardKey,
  defaultView,
  filterCount,
  headerSortHref,
  parseView,
  resetFiltersHref,
  stagesKey,
  toggleStageHref,
  viewHref,
  viewName,
  type LeadView,
  type ViewPage,
} from "@/lib/views/params";

// Parses the query string of an href the same way Next hands searchParams to
// a page, so a round trip proves the builder and the parser agree.
function reparse(page: ViewPage, href: string): LeadView {
  return parseView(page, Object.fromEntries(new URL(href, "http://x").searchParams));
}

describe("parseView", () => {
  it("gives each page its defaults when the URL is bare", () => {
    expect(parseView("contacts", {})).toEqual({
      archived: false,
      mine: false,
      stages: [],
      sort: "name",
      dir: "asc",
      layout: "board",
    });
    expect(parseView("pipeline", {}).sort).toBe("priority");
  });

  it("reads every param", () => {
    expect(
      parseView("contacts", {
        archived: "true",
        mine: "true",
        stage: "QUOTED",
        sort: "amount",
        dir: "desc",
      }),
    ).toEqual({
      archived: true,
      mine: true,
      stages: ["QUOTED"],
      sort: "amount",
      dir: "desc",
      layout: "board",
    });
    expect(parseView("pipeline", { view: "table" }).layout).toBe("table");
  });

  it("ignores a param that does not belong to the page", () => {
    expect(parseView("pipeline", { archived: "true" }).archived).toBe(false);
    expect(parseView("contacts", { view: "table" }).layout).toBe("board");
    expect(parseView("contacts", { sort: "priority" }).sort).toBe("name");
  });

  it("falls back to the default for a bad value and never throws", () => {
    const view = parseView("pipeline", {
      mine: "yes",
      stage: "WON,foo,",
      sort: "bogus",
      dir: "sideways",
      view: "grid",
    });
    expect(view).toEqual(defaultView("pipeline"));
  });

  it("takes the first value when a param repeats", () => {
    expect(parseView("contacts", { mine: ["true", "false"] }).mine).toBe(true);
  });

  it("normalises the stage list: known values, deduped, pipeline order", () => {
    const view = parseView("pipeline", { stage: "ACTIVE,NEW,NEW,nope" });
    expect(view.stages).toEqual(["NEW", "ACTIVE"]);
    expect(stagesKey(view.stages)).toBe("NEW,ACTIVE");
  });

  it("gives two URLs that mean the same view the same stage key", () => {
    const a = parseView("pipeline", { stage: "QUOTED,NEW" });
    const b = parseView("pipeline", { stage: "NEW,QUOTED,QUOTED" });
    expect(stagesKey(a.stages)).toBe(stagesKey(b.stages));
  });

  it("gives Priority no direction", () => {
    expect(parseView("pipeline", { dir: "desc" }).dir).toBe("asc");
  });
});

describe("viewHref", () => {
  it("omits every default", () => {
    expect(viewHref("contacts", defaultView("contacts"))).toBe("/contacts");
    expect(viewHref("pipeline", defaultView("pipeline"))).toBe("/pipeline");
  });

  it("changes one thing and keeps the rest", () => {
    const view = parseView("contacts", { archived: "true", sort: "amount" });
    expect(viewHref("contacts", view, { mine: true })).toBe(
      "/contacts?archived=true&mine=true&sort=amount",
    );
  });

  it("writes the stage list in pipeline order with plain commas", () => {
    const view = defaultView("pipeline");
    expect(viewHref("pipeline", view, { stages: ["ACTIVE", "QUOTED"] })).toBe(
      "/pipeline?stage=QUOTED,ACTIVE",
    );
  });

  it("writes dir only when it is desc and the sort has a direction", () => {
    expect(viewHref("contacts", defaultView("contacts"), { dir: "desc" })).toBe("/contacts?dir=desc");
    expect(viewHref("pipeline", defaultView("pipeline"), { dir: "desc" })).toBe("/pipeline");
  });

  it("writes the table layout on Pipeline only", () => {
    expect(viewHref("pipeline", defaultView("pipeline"), { layout: "table" })).toBe(
      "/pipeline?view=table",
    );
    expect(viewHref("contacts", defaultView("contacts"), { layout: "table" })).toBe("/contacts");
  });

  it("round-trips through parseView", () => {
    const view: LeadView = {
      archived: false,
      mine: true,
      stages: ["DISCOVERY", "ACTIVE"],
      sort: "due",
      dir: "desc",
      layout: "table",
    };
    expect(reparse("pipeline", viewHref("pipeline", view))).toEqual(view);
  });
});

describe("headerSortHref", () => {
  it("flips the direction of the active sort", () => {
    const view = parseView("contacts", {});
    expect(headerSortHref("contacts", view, "name")).toBe("/contacts?dir=desc");
    const desc = parseView("contacts", { dir: "desc" });
    expect(headerSortHref("contacts", desc, "name")).toBe("/contacts");
  });

  it("starts a new sort ascending", () => {
    const view = parseView("contacts", { sort: "amount", dir: "desc" });
    expect(headerSortHref("contacts", view, "stage")).toBe("/contacts?sort=stage");
    expect(headerSortHref("pipeline", defaultView("pipeline"), "amount")).toBe(
      "/pipeline?sort=amount",
    );
  });
});

describe("filters", () => {
  it("adds and removes one stage", () => {
    const view = parseView("pipeline", { stage: "NEW" });
    expect(toggleStageHref("pipeline", view, "QUOTED")).toBe("/pipeline?stage=NEW,QUOTED");
    expect(toggleStageHref("pipeline", view, "NEW")).toBe("/pipeline");
  });

  it("counts the filters that are not default", () => {
    expect(filterCount("contacts", defaultView("contacts"))).toBe(0);
    const view = parseView("contacts", { archived: "true", mine: "true", stage: "NEW,QUOTED" });
    expect(filterCount("contacts", view)).toBe(3);
  });

  it("resets the filters and keeps the sort and the layout", () => {
    const view = parseView("pipeline", { mine: "true", stage: "NEW", sort: "amount", view: "table" });
    expect(resetFiltersHref("pipeline", view)).toBe("/pipeline?sort=amount&view=table");
  });
});

describe("viewName", () => {
  it("names the view from its filters", () => {
    expect(viewName("contacts", defaultView("contacts"))).toBe("Active leads");
    expect(viewName("contacts", parseView("contacts", { archived: "true" }))).toBe("Archived leads");
    expect(viewName("contacts", parseView("contacts", { archived: "true", mine: "true" }))).toBe(
      "Archived · My leads",
    );
    expect(viewName("pipeline", parseView("pipeline", { stage: "ACTIVE,QUOTED" }))).toBe(
      "Open leads · Quoted, Active",
    );
    expect(viewName("pipeline", parseView("pipeline", { mine: "true" }))).toBe("Open · My leads");
  });
});

describe("boardKey", () => {
  it("changes when the fetched leads change, and not for a sort", () => {
    const base = defaultView("pipeline");
    const key = boardKey(base);
    expect(boardKey({ ...base, mine: true })).not.toBe(key);
    expect(boardKey({ ...base, stages: ["NEW"] })).not.toBe(key);
    expect(boardKey({ ...base, sort: "amount", dir: "desc" })).toBe(key);
    expect(boardKey({ ...base, layout: "table" })).toBe(key);
  });
});
