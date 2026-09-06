import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Prospect } from "@/lib/prospects/queries";

// jsdom implements no layout, so ProspectRow's arrival-scroll effect would
// throw before any assertion ran. Same shim TasksSection's own test uses.
const scrollIntoView = vi.fn();
beforeAll(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});

// The Server Actions are never invoked here — mocked only so the "use server"
// modules (and their next/cache imports) never load in jsdom.
vi.mock("@/lib/actions/prospect-actions", () => ({
  setProspectStatus: vi.fn(),
  setProspectNotes: vi.fn(),
  setProspectArchived: vi.fn(),
}));

vi.mock("@/lib/actions/prospect-promote-actions", () => ({
  promoteProspect: vi.fn(),
}));

const base = {
  category: "Plumber",
  address: null,
  state: null,
  postal_code: null,
  phone: null,
  website_url: null,
  notes: null,
  promoted_lead_id: null,
  possible_duplicate_lead_id: null,
  archived: false,
  rating: null,
  review_count: null,
  google_maps_url: null,
};

const REDWOOD = {
  ...base,
  id: "prospect-1",
  name: "Redwood Plumbing",
  city: "Gisborne",
  status: "NEW",
} as unknown as Prospect;

// A second row with a DIFFERENT status, so the status filter can be set to
// something that excludes the highlight target.
const ASHFIELD = {
  ...base,
  id: "prospect-2",
  name: "Ashfield Roofing",
  city: "Napier",
  status: "CALLED",
} as unknown as Prospect;

const { ProspectsTable } = await import("./ProspectsTable");

describe("ProspectsTable — command-palette arrival highlight", () => {
  beforeEach(() => {
    scrollIntoView.mockClear();
  });

  it("marks and scrolls to the named row", async () => {
    render(<ProspectsTable prospects={[REDWOOD, ASHFIELD]} highlightProspectId="prospect-1" />);

    const row = screen.getByText("Redwood Plumbing").closest("tr")!;
    await waitFor(() => expect(row).toHaveAttribute("data-highlighted", "true"));
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("marks only the named row, never a sibling", async () => {
    const { container } = render(
      <ProspectsTable prospects={[REDWOOD, ASHFIELD]} highlightProspectId="prospect-2" />,
    );

    await waitFor(() =>
      expect(container.querySelectorAll("[data-highlighted]")).toHaveLength(1),
    );
    expect(screen.getByText("Ashfield Roofing").closest("tr")).toHaveAttribute(
      "data-highlighted",
      "true",
    );
  });

  // The one this feature would silently no-op without, and the exact sibling of
  // TasksSection's Completed-tab test: this table's own status filter and search
  // box survive a client-side navigation, so a target the current filter
  // excludes is not in the DOM at all and there is nothing to scroll to.
  it("clears a filter that excludes the target before marking it", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ProspectsTable prospects={[REDWOOD, ASHFIELD]} highlightProspectId={null} />,
    );

    // Operator narrows to CALLED — Redwood (NEW) leaves the DOM entirely.
    await user.selectOptions(screen.getByLabelText("Status"), "CALLED");
    expect(screen.queryByText("Redwood Plumbing")).toBeNull();

    // Now the palette arrives naming Redwood.
    rerender(<ProspectsTable prospects={[REDWOOD, ASHFIELD]} highlightProspectId="prospect-1" />);

    const row = (await screen.findByText("Redwood Plumbing")).closest("tr")!;
    await waitFor(() => expect(row).toHaveAttribute("data-highlighted", "true"));
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("clears the marker on a timer rather than leaving it as a selected state", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<ProspectsTable prospects={[REDWOOD, ASHFIELD]} highlightProspectId="prospect-1" />);
      const row = screen.getByText("Redwood Plumbing").closest("tr")!;
      await waitFor(() => expect(row).toHaveAttribute("data-highlighted", "true"));

      await act(async () => {
        vi.advanceTimersByTime(2500);
      });

      expect(row).not.toHaveAttribute("data-highlighted");
    } finally {
      vi.useRealTimers();
    }
  });

  it("highlights nothing when no prospect id is passed", async () => {
    const { container } = render(<ProspectsTable prospects={[REDWOOD, ASHFIELD]} />);
    await screen.findByText("Redwood Plumbing");
    expect(container.querySelector("[data-highlighted]")).toBeNull();
  });
});
