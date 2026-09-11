import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccordionPanel } from "./accordion/AccordionPanel";
import { JumpPanel } from "./jump/JumpPanel";
import { SplitPanel } from "./split/SplitPanel";
import { TabsPanel } from "./tabs/TabsPanel";

// The four variants exist to answer ONE question — how do you reach a section
// without scrolling the whole panel — so these tests assert that each one
// actually answers it, in its own way. They deliberately do not assert layout:
// that is what the /shell/detail pages are for.
//
// WHY THIS FILE EXISTS AT ALL, given the comps are throwaway. The interactions
// could not be verified in the browser this session: the Browser pane was
// hidden, so Chromium fired no requestAnimationFrame, React never hydrated
// (measured: `hydrated: false` on a live button), and every click no-opped.
// That is the trap CLAUDE.md § Session & Verification Discipline documents.
// jsdom does not gate hydration on rAF, so these assertions are the evidence
// the browser could not give.

beforeEach(() => {
  // jsdom implements neither. Both are load-bearing here: Rail calls
  // scrollIntoView on every jump, and its scroll-spy constructs an observer on
  // mount, so without these the component throws before a single assertion.
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = "";
      thresholds = [];
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Variant A — Jump strip", () => {
  it("keeps every section mounted, which is its whole thesis", () => {
    render(<JumpPanel />);

    // Nothing is hidden: content from the first and last sections is present
    // at the same time. This is the assertion that separates Rail from Tabs.
    expect(screen.getByRole("heading", { name: "Executive brief" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add a note" })).toBeInTheDocument();
  });

  it("scrolls the panel to the section a jump button names", async () => {
    const user = userEvent.setup();
    render(<JumpPanel />);

    await user.click(screen.getByRole("button", { name: "Activity, 3 entries" }));

    const activity = document.getElementById("activity");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    // `this` is the section being scrolled to — the assertion that catches a
    // jump wired to the wrong id, which a "it scrolled" check would pass.
    expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts[0]).toBe(activity);
  });

  it("marks the jumped-to section as current", async () => {
    const user = userEvent.setup();
    render(<JumpPanel />);

    const nav = screen.getByRole("navigation", { name: "Jump to section" });
    expect(within(nav).getByRole("button", { name: "Brief" })).toHaveAttribute(
      "aria-current",
      "true",
    );

    await user.click(within(nav).getByRole("button", { name: "Enquiries, 2 recorded" }));

    expect(within(nav).getByRole("button", { name: "Enquiries, 2 recorded" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(within(nav).getByRole("button", { name: "Brief" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("names each counted jump button as a sentence, never as one run-on word", () => {
    render(<JumpPanel />);
    const nav = screen.getByRole("navigation", { name: "Jump to section" });

    // The trap the accordion shipped: label and count in adjacent spans with no
    // whitespace text node between them compute as "Tasks3". Assert the exact
    // name, so a dropped aria-label fails here rather than on a screen reader.
    expect(within(nav).getByRole("button", { name: "Tasks, 3 open" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Enquiries, 2 recorded" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Activity, 3 entries" })).toBeInTheDocument();
    expect(within(nav).queryByRole("button", { name: /Tasks3|Enquiries2|Activity3/ })).toBeNull();
  });

  it("shows the count on screen for list sections and invents none for Brief or Notes", () => {
    render(<JumpPanel />);
    const nav = screen.getByRole("navigation", { name: "Jump to section" });

    // The visible number is what stops the strip reading as a tab bar — an
    // aria-label alone would pass the test above while changing nothing a
    // sighted operator sees.
    expect(within(nav).getByRole("button", { name: "Tasks, 3 open" })).toHaveTextContent(/^Tasks\s*3$/);
    expect(within(nav).getByRole("button", { name: "Activity, 3 entries" })).toHaveTextContent(/^Activity\s*3$/);
    expect(within(nav).getByRole("button", { name: "Brief" })).toHaveTextContent(/^Brief$/);
    expect(within(nav).getByRole("button", { name: "Notes" })).toHaveTextContent(/^Notes$/);
  });
});

describe("Variant B — Tabs", () => {
  it("shows one section and unmounts the rest", async () => {
    const user = userEvent.setup();
    render(<TabsPanel />);

    expect(screen.getByRole("heading", { name: "Executive brief" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Activity" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Activity" }));

    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Executive brief" })).not.toBeInTheDocument();
  });

  it("moves between tabs with the arrow keys and keeps one tab stop", async () => {
    const user = userEvent.setup();
    render(<TabsPanel />);

    const brief = screen.getByRole("tab", { name: "Brief" });
    brief.focus();
    await user.keyboard("{ArrowRight}");

    const tasks = screen.getByRole("tab", { name: "Tasks" });
    expect(tasks).toHaveFocus();
    expect(tasks).toHaveAttribute("aria-selected", "true");
    // Roving tabindex: the unselected tabs are out of the tab order, so a
    // keyboard user tabs past the list instead of through five stops.
    expect(tasks).toHaveAttribute("tabindex", "0");
    expect(brief).toHaveAttribute("tabindex", "-1");
  });

  it("wraps from the last tab to the first", async () => {
    const user = userEvent.setup();
    render(<TabsPanel />);

    screen.getByRole("tab", { name: "Brief" }).focus();
    await user.keyboard("{ArrowLeft}");

    expect(screen.getByRole("tab", { name: "Notes" })).toHaveFocus();
  });
});

describe("Variant C — Accordion", () => {
  it("opens with only the brief expanded", () => {
    render(<AccordionPanel />);

    expect(screen.getByRole("button", { name: /^Brief/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: /^Tasks/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("shows a count on each list section without opening it", () => {
    render(<AccordionPanel />);

    // 3 open tasks, 2 enquiries, 3 activity entries — the whole point of this
    // variant is that those numbers are readable before any click.
    expect(screen.getByRole("button", { name: "Tasks, 3 open" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enquiries, 2 recorded" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activity, 3 entries" })).toBeInTheDocument();
  });

  it("keeps sections open together, which is what tabs cannot do", async () => {
    const user = userEvent.setup();
    render(<AccordionPanel />);

    await user.click(screen.getByRole("button", { name: "Tasks, 3 open" }));
    await user.click(screen.getByRole("button", { name: "Enquiries, 2 recorded" }));

    expect(screen.getByRole("button", { name: "Tasks, 3 open" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: "Enquiries, 2 recorded" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    // …and the brief from the start is still open alongside both.
    expect(screen.getByRole("button", { name: /^Brief/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("does not print a section's name twice", () => {
    render(<AccordionPanel />);
    // The disclosure header already says "Brief"; the block's own heading is
    // suppressed via showHeading. A duplicate here is the sloppiest thing an
    // accordion can do, and it is invisible in a diff.
    expect(screen.queryByRole("heading", { name: "Executive brief" })).not.toBeInTheDocument();
  });
});

describe("Variant D — Split", () => {
  it("keeps the brief and the note composer out of the tab list", () => {
    render(<SplitPanel />);

    expect(screen.queryByRole("tab", { name: "Brief" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Notes" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Tasks",
      "Enquiries",
      "Activity",
    ]);
  });

  it("keeps the brief on screen while another section is selected", async () => {
    const user = userEvent.setup();
    render(<SplitPanel />);

    await user.click(screen.getByRole("tab", { name: "Activity" }));

    // The variant's entire bet: switching sections does not cost you the brief.
    expect(screen.getByRole("heading", { name: "Executive brief" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument();
  });

  it("renders exactly one note composer", () => {
    render(<SplitPanel />);
    // Two composers writing to one lead was a real bug in this file's first
    // draft, from leaving Notes in both the column and the tab list.
    expect(screen.getAllByPlaceholderText("Add a note…")).toHaveLength(1);
  });
});
