import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { formatCurrency, formatDueAt, isOverdue } from "@/lib/format";
import { STATUS_TONE } from "@/lib/leads/status-tone";
import { BriefToday } from "./brief/BriefToday";
import { LedgerToday } from "./ledger/LedgerToday";
import {
  LANE_CARD_CAP,
  MOCK_CURRENCY,
  MOCK_SPARSE_LEADS,
  MOCK_SPARSE_TASKS,
  MOCK_TASKS_DUE,
  MOCK_TIMEZONE,
  MOCK_TODAY_LEADS,
  deriveLanes,
} from "./preview/mock-today";

// The two variants differ in density and hierarchy only; these tests pin
// everything that must NOT differ between them — the field set, the stage-tone
// badge, the Going Cold treatment, and the cap-and-expand control in all four
// sections. Density itself is judged on /shell/today, not here.
//
// Same shape as PipelineVariants.test.tsx / DetailVariants.test.tsx.
//
// WHAT THIS CANNOT SEE. jsdom has no layout engine, so every
// getBoundingClientRect() is 0x0 and a value squeezed to a sliver still reads
// as present here. That failure mode belongs to `npm run check:widths`, which
// drives a real Chrome — see scripts/check-comp-text-widths.mjs.

const VARIANTS = [
  ["Ledger", LedgerToday],
  ["Brief", BriefToday],
] as const;

const lanes = deriveLanes();

const SECTIONS = ["Tasks Due", "SLA Critical", "High-Value", "Starred"] as const;

function laneFor(title: string): HTMLElement {
  return screen.getByRole("region", { name: `${title} section` });
}

function cardFor(name: string, scope: HTMLElement): HTMLElement {
  const card = within(scope).getByText(name).closest<HTMLElement>("[data-lead-card]");
  if (!card) throw new Error(`no card for ${name}`);
  return card;
}

describe("the fixture", () => {
  // If the fixture drifts into one state, the comps stop showing the thing
  // they exist to show — the reason the demo org's own rows were not used.
  it("mixes every state the card has to render", () => {
    const leads = MOCK_TODAY_LEADS;
    expect(leads).toHaveLength(20);
    expect(MOCK_TASKS_DUE).toHaveLength(6);
    expect(leads.some((l) => isOverdue(l.next_action_at))).toBe(true);
    expect(leads.some((l) => !isOverdue(l.next_action_at))).toBe(true);
    expect(leads.some((l) => l.is_starred)).toBe(true);
    expect(leads.some((l) => !l.is_starred)).toBe(true);
    expect(leads.some((l) => l.company === null)).toBe(true);
    expect(leads.some((l) => l.estimated_revenue === 0)).toBe(true);
  });

  // The stage-tone mapping is the point of the prompt, so all four stages have
  // to be present or the badge is never seen doing anything.
  it("carries every stage the tone map knows", () => {
    const stages = new Set(MOCK_TODAY_LEADS.map((l) => l.status));
    for (const stage of Object.keys(STATUS_TONE)) {
      expect(stages.has(stage)).toBe(true);
    }
  });

  // Every lane must overflow the cap, or the expand control is never exercised
  // in three of the four sections.
  it("overflows the cap in all four sections", () => {
    expect(MOCK_TASKS_DUE.length).toBeGreaterThan(LANE_CARD_CAP);
    expect(lanes.sla.length).toBeGreaterThan(LANE_CARD_CAP);
    expect(lanes.highValue.length).toBeGreaterThan(LANE_CARD_CAP);
    expect(lanes.starred.length).toBeGreaterThan(LANE_CARD_CAP);
  });

  // SLA Critical's membership test is the Going Cold test. FORK A was chosen
  // on 2026-09-15: the lane stays "every overdue lead" and getSlaCriticalLeads
  // is not touched. This pins that meaning out loud, so moving to Fork B — a
  // stricter slice — has to break a named test rather than happen quietly.
  it("makes every SLA Critical lead cold by construction (Fork A)", () => {
    expect(lanes.sla.length).toBeGreaterThan(0);
    expect(lanes.sla.every((l) => isOverdue(l.next_action_at))).toBe(true);
  });
});

describe.each(VARIANTS)("Variant %s", (_name, Today) => {
  it("renders all four sections", () => {
    render(<Today />);
    for (const title of SECTIONS) {
      expect(laneFor(title)).toBeInTheDocument();
    }
  });

  it("renders the fixed field set and nothing more", () => {
    render(<Today />);
    // Melissa Trent: cold, starred, has a company — appears in SLA Critical.
    const lead = MOCK_TODAY_LEADS.find((l) => l.client_name === "Melissa Trent")!;
    const card = cardFor(lead.client_name, laneFor("SLA Critical"));

    expect(within(card).getByText(lead.company!)).toBeInTheDocument();
    expect(
      within(card).getByText(formatCurrency(lead.estimated_revenue, MOCK_CURRENCY)),
    ).toBeInTheDocument();
    expect(
      within(card).getByText(formatDueAt(lead.next_action_at, MOCK_TIMEZONE)),
    ).toBeInTheDocument();
    expect(within(card).getByRole("img", { name: "Starred" })).toBeInTheDocument();
    expect(within(card).getByText(lead.status)).toBeInTheDocument();

    // Fields the card deliberately does not carry.
    expect(within(card).queryByText(lead.email)).toBeNull();
  });

  // THE BADGE TONE, PER STAGE. The whole reason for the prompt: a stage has to
  // render through the shared STATUS_TONE map, never a second hand-rolled copy
  // of the rule, and never as plain uncoloured text.
  it("renders every stage through the shared STATUS_TONE map", () => {
    render(<Today />);
    const seen = new Set<string>();

    for (const card of document.querySelectorAll<HTMLElement>("[data-lead-card]")) {
      const name = card.querySelector("p")!.textContent!;
      const lead = MOCK_TODAY_LEADS.find((l) => l.client_name === name)!;
      const badge = within(card).getByText(lead.status);
      const expected = STATUS_TONE[lead.status];

      // The tone's own background class, straight off the map's value — so a
      // second copy of the rule with different colours fails here.
      expect(expected).toBeDefined();
      expect(badge.className).toContain(`bg-pill-${expected}-bg`);
      expect(badge.className).toContain(`text-pill-${expected}-fg`);
      seen.add(lead.status);
    }

    // All four tones actually rendered, so this is not a one-stage pass.
    expect(seen.size).toBe(Object.keys(STATUS_TONE).length);
  });

  // The correction to the brief, pinned: an overdue lead keeps its stage
  // colour. The shipped LeadCard forces "neutral" here, which is what makes
  // SLA Critical read grey.
  it("keeps the stage colour on an overdue lead, and adds a separate cold pill", () => {
    render(<Today />);
    const lane = laneFor("SLA Critical");
    const lead = lanes.sla[0];
    const card = cardFor(lead.client_name, lane);

    const badge = within(card).getByText(lead.status);
    expect(badge.className).toContain(`bg-pill-${STATUS_TONE[lead.status]}-bg`);
    expect(badge.className).not.toContain("bg-canvas-soft");

    // Going Cold's desaturated half, on its own element rather than eating the
    // stage pill.
    const cold = within(card).getByText("Overdue");
    expect(cold.className).toContain("text-cold-fg");
  });

  it("marks exactly the overdue leads cold, via Card's own prop", () => {
    render(<Today />);
    for (const card of document.querySelectorAll<HTMLElement>("[data-lead-card]")) {
      const name = card.querySelector("p")!.textContent!;
      const lead = MOCK_TODAY_LEADS.find((l) => l.client_name === name)!;
      expect(card.dataset.cold === "true").toBe(isOverdue(lead.next_action_at));
    }
  });

  // An overdue TASK must NOT get the Going Cold treatment — the shipped
  // TasksDueQueue's own rule, kept because an overdue task and a lead
  // breaching its SLA are different concepts.
  it("never gives a task the Going Cold treatment", () => {
    render(<Today />);
    const cards = document.querySelectorAll<HTMLElement>("[data-task-card]");
    expect(cards.length).toBe(LANE_CARD_CAP);
    for (const card of cards) {
      expect(card.dataset.cold).toBeUndefined();
    }
    // It gets the decorative orange pill instead.
    const overdue = within(laneFor("Tasks Due")).getAllByText("Overdue");
    expect(overdue.length).toBeGreaterThan(0);
    for (const pill of overdue) {
      expect(pill.className).toContain("text-pill-orange-fg");
      expect(pill.className).not.toContain("text-cold-fg");
    }
  });

  // THE CAP, IN ALL FOUR SECTIONS. The prompt's rule is that the affordance is
  // identical everywhere, so this runs over every section rather than one.
  it.each(SECTIONS)("caps %s at the cap and expands it in place", async (title) => {
    const user = userEvent.setup();
    render(<Today />);
    const lane = laneFor(title);
    const selector = title === "Tasks Due" ? "[data-task-card]" : "[data-lead-card]";
    const total =
      title === "Tasks Due"
        ? MOCK_TASKS_DUE.length
        : title === "SLA Critical"
          ? lanes.sla.length
          : title === "High-Value"
            ? lanes.highValue.length
            : lanes.starred.length;
    const hidden = total - LANE_CARD_CAP;

    expect(lane.querySelectorAll(selector)).toHaveLength(LANE_CARD_CAP);

    const more = within(lane).getByRole("button", { name: `+${hidden} more` });
    expect(more).toHaveAttribute("aria-expanded", "false");
    await user.click(more);

    expect(lane.querySelectorAll(selector)).toHaveLength(total);
    const fewer = within(lane).getByRole("button", { name: "Show fewer" });
    expect(fewer).toHaveAttribute("aria-expanded", "true");
    await user.click(fewer);
    expect(lane.querySelectorAll(selector)).toHaveLength(LANE_CARD_CAP);
  });

  // The lanes are three filters over one lead table, so a lead really can
  // appear in all three. Pinned so a future "de-duplicate the page" change is
  // a deliberate decision rather than a silent one.
  it("shows a lead in every lane whose predicate it matches", () => {
    render(<Today />);
    // Melissa Trent: overdue, starred, and inside the top ten by revenue.
    expect(within(laneFor("SLA Critical")).getByText("Melissa Trent")).toBeInTheDocument();
    expect(within(laneFor("High-Value")).getByText("Melissa Trent")).toBeInTheDocument();
    expect(within(laneFor("Starred")).getByText("Melissa Trent")).toBeInTheDocument();
  });

  // A near-empty real org has to render too, and an empty section keeps its
  // heading rather than collapsing — the operator is told "nothing overdue",
  // which is information.
  it("renders a near-empty org with every heading intact and no expand control", () => {
    render(<Today leads={MOCK_SPARSE_LEADS} tasks={MOCK_SPARSE_TASKS} />);
    for (const title of SECTIONS) {
      expect(laneFor(title)).toBeInTheDocument();
    }
    expect(within(laneFor("SLA Critical")).getByText("Nothing overdue.")).toBeInTheDocument();
    expect(within(laneFor("Starred")).getByText("No starred accounts.")).toBeInTheDocument();
    expect(within(laneFor("High-Value")).getByText("Alder & Finch Joinery")).toBeInTheDocument();

    // Nothing is over the cap, so no section shows the control.
    for (const title of SECTIONS) {
      expect(within(laneFor(title)).queryByRole("button")).toBeNull();
    }
  });

  it("renders a completely empty org without a single card", () => {
    render(<Today leads={[]} tasks={[]} />);
    for (const title of SECTIONS) {
      expect(laneFor(title)).toBeInTheDocument();
    }
    expect(document.querySelectorAll("[data-lead-card]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-task-card]")).toHaveLength(0);
    expect(within(laneFor("Tasks Due")).getByText("No tasks due.")).toBeInTheDocument();
  });

  // No charts on this page — they stay exclusive to /reports.
  it("renders no chart", () => {
    render(<Today />);
    expect(document.querySelector("svg[data-chart]")).toBeNull();
    expect(document.querySelector("canvas")).toBeNull();
  });
});
