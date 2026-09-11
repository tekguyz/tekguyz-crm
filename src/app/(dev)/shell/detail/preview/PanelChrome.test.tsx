import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CompactHeader, MetaStrip } from "./PanelChrome";
import { MOCK_LEAD } from "./mock-lead";

// These comps are dev-only and will be thrown away or promoted at the end of
// Stage 1, so they get the tests that protect the two things a browser pass
// cannot check cheaply and that a silent regression would hide:
//   1. the quick-action links carry the real protocol hrefs, and
//   2. the metadata strip reads from real `leads` columns.
// Layout and colour are judged on the page, not here.

describe("CompactHeader", () => {
  it("renders all four click-to-action shortcuts as real protocol links", () => {
    render(<CompactHeader />);

    // Named by aria-label, because the controls are icon-only. If one of these
    // queries starts failing, the icon lost its accessible name — which is the
    // failure mode that is invisible in a screenshot.
    expect(screen.getByRole("link", { name: "Call" })).toHaveAttribute(
      "href",
      `tel:${MOCK_LEAD.phone}`,
    );
    expect(screen.getByRole("link", { name: "Text" })).toHaveAttribute(
      "href",
      `sms:${MOCK_LEAD.phone}`,
    );
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      `mailto:${MOCK_LEAD.email}`,
    );

    const map = screen.getByRole("link", { name: "Map" });
    expect(map).toHaveAttribute(
      "href",
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        MOCK_LEAD.physical_address ?? "",
      )}`,
    );
    // A cross-origin target="_blank" without this pair hands the opened page a
    // live window.opener reference back into the app.
    expect(map).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the quick actions as <a>, not <button>", () => {
    render(<CompactHeader />);
    // The whole reason Button's asChild is used here. A <button> cannot carry
    // tel:/mailto:, so if these ever render as buttons the shortcuts are dead
    // while still looking perfectly correct.
    expect(screen.getByRole("link", { name: "Call" }).tagName).toBe("A");
  });

  it("shows the lead's name and company", () => {
    render(<CompactHeader />);
    expect(screen.getByText(MOCK_LEAD.client_name)).toBeInTheDocument();
    expect(screen.getByText(MOCK_LEAD.company ?? "")).toBeInTheDocument();
  });
});

describe("MetaStrip", () => {
  it("labels four fields that are real columns on public.leads", () => {
    render(<MetaStrip />);

    for (const label of ["Stage", "Est. value", "Next action", "Source"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    expect(screen.getByText(MOCK_LEAD.status)).toBeInTheDocument();
    // No cents: formatCurrency pins maximumFractionDigits to 0.
    expect(screen.getByText("$31,500")).toBeInTheDocument();
    expect(screen.getByText(MOCK_LEAD.lead_source ?? "")).toBeInTheDocument();
  });

  it("shows the Going Cold signal when next_action_at is in the past", () => {
    // The fixture's next_action_at is deliberately overdue, so this is the
    // default state rather than a special case that has to be constructed.
    render(<MetaStrip />);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });
});
