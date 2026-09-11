import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { formatCurrency, formatDueAt, isOverdue } from "@/lib/format";
import { groupLeadsByStatus } from "@/lib/leads/pipeline";
import { GroupedBoard } from "./grouped/GroupedCard";
import { LineBoard } from "./line/LineCard";
import {
  COLUMN_CARD_CAP,
  MOCK_CURRENCY,
  MOCK_PIPELINE_LEADS,
  MOCK_TIMEZONE,
} from "./preview/mock-pipeline";
import { SplitBoard } from "./split/SplitCard";

// The three variants differ in layout only; these tests pin everything that
// must NOT differ between them — the field set, the Going Cold treatment and
// the overflow control. Layout itself is judged on /shell/pipeline, not here.

const VARIANTS = [
  ["Line", LineBoard],
  ["Split", SplitBoard],
  ["Grouped", GroupedBoard],
] as const;

const columns = groupLeadsByStatus(MOCK_PIPELINE_LEADS);

function cardFor(name: string): HTMLElement {
  const card = screen.getByText(name).closest<HTMLElement>("[data-lead-card]");
  if (!card) throw new Error(`no card for ${name}`);
  return card;
}

describe("the fixture", () => {
  // If the fixture drifts into one state, the comps stop showing the thing
  // they exist to show — the reason the demo org's data was not used.
  it("mixes every state the card has to render", () => {
    const leads = MOCK_PIPELINE_LEADS;
    expect(leads.some((l) => isOverdue(l.next_action_at))).toBe(true);
    expect(leads.some((l) => !isOverdue(l.next_action_at))).toBe(true);
    expect(leads.some((l) => l.is_starred)).toBe(true);
    expect(leads.some((l) => !l.is_starred)).toBe(true);
    expect(leads.some((l) => l.assigned_to)).toBe(true);
    expect(leads.some((l) => !l.assigned_to)).toBe(true);
    expect(leads.some((l) => l.company === null)).toBe(true);
    expect(Object.values(columns).some((c) => c.length > COLUMN_CARD_CAP)).toBe(true);
  });
});

describe.each(VARIANTS)("Variant %s", (_name, Board) => {
  it("renders the fixed field set and nothing more", () => {
    render(<Board />);
    const lead = columns.QUOTED[0]; // Melissa Trent: cold, starred, assigned
    const card = cardFor(lead.client_name);

    expect(within(card).getByText(lead.company!)).toBeInTheDocument();
    expect(
      within(card).getByText(formatCurrency(lead.estimated_revenue, MOCK_CURRENCY)),
    ).toBeInTheDocument();
    expect(
      within(card).getByText(formatDueAt(lead.next_action_at, MOCK_TIMEZONE)),
    ).toBeInTheDocument();
    expect(within(card).getByRole("img", { name: "Starred" })).toBeInTheDocument();
    expect(within(card).getByText("alejandro")).toBeInTheDocument();

    // No status badge: the column is the status.
    expect(within(card).queryByText(/quoted/i)).toBeNull();
  });

  it("marks exactly the overdue leads cold, via Card's own prop", () => {
    render(<Board />);
    for (const card of document.querySelectorAll<HTMLElement>("[data-lead-card]")) {
      const name = card.querySelector("p")!.textContent!;
      const lead = MOCK_PIPELINE_LEADS.find((l) => l.client_name === name)!;
      expect(card.dataset.cold === "true").toBe(isOverdue(lead.next_action_at));
    }
  });

  it("renders no assignee row for an unassigned lead, and survives no company", () => {
    render(<Board />);
    // Ivy Tran: no company, unassigned, and inside Discovery's visible cards
    // (Tyler Brooks is the same shape but ranks past New's tenth card).
    const ivy = cardFor("Ivy Tran");
    expect(within(ivy).queryByText("alejandro")).toBeNull();
    expect(within(ivy).queryByText("priya")).toBeNull();
    expect(within(ivy).queryByText("Former member")).toBeNull();
    // No separator at all: both optional neighbours of the date are absent.
    expect(ivy.textContent).not.toContain("·");
  });

  it("caps a long column at ten and expands it in place", async () => {
    const user = userEvent.setup();
    render(<Board />);
    const column = screen.getByRole("region", { name: "New column" });
    const hidden = columns.NEW.length - COLUMN_CARD_CAP;

    expect(column.querySelectorAll("[data-lead-card]")).toHaveLength(COLUMN_CARD_CAP);
    // The first ten are the shipped ranking's first ten, not a new order.
    expect(within(column).getByText(columns.NEW[0].client_name)).toBeInTheDocument();
    expect(within(column).queryByText(columns.NEW[COLUMN_CARD_CAP].client_name)).toBeNull();

    const more = within(column).getByRole("button", { name: `+${hidden} more` });
    expect(more).toHaveAttribute("aria-expanded", "false");
    await user.click(more);

    expect(column.querySelectorAll("[data-lead-card]")).toHaveLength(columns.NEW.length);
    const fewer = within(column).getByRole("button", { name: "Show fewer" });
    expect(fewer).toHaveAttribute("aria-expanded", "true");
    await user.click(fewer);
    expect(column.querySelectorAll("[data-lead-card]")).toHaveLength(COLUMN_CARD_CAP);
  });

  it("shows no overflow control on a column under the cap", () => {
    render(<Board />);
    const column = screen.getByRole("region", { name: "Quoted column" });
    expect(within(column).queryByRole("button")).toBeNull();
  });
});
