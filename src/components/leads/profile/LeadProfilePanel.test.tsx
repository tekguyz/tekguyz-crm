import { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Lead } from "@/lib/leads/queries";

// The four data sections each fetch through a Server Action, so they are
// stubbed — this suite is about the panel's chrome, not about their contents,
// and each of them already has (or does not need) its own suite. The stubs do
// one thing the real components do and that this panel depends on: report how
// many rows they loaded.
//
// EACH STUB REPORTS FROM A useEffect, NOT FROM ITS RENDER BODY, and that is
// not stylistic. Calling the parent's setState during a child's render makes
// the parent re-render, which re-renders the child, which reports again — an
// infinite loop that hangs the test runner with no output rather than failing.
// The real sections report from an effect for the same reason; a stub that
// did otherwise would be testing a component this panel never mounts.
vi.mock("@/lib/organizations/actions", () => ({
  fetchOrgDisplaySettings: vi.fn(async () => ({
    timeZone: "America/Chicago",
    currencyFormat: "USD",
  })),
}));
vi.mock("@/components/leads/profile/TasksSection", () => ({
  TasksSection: ({ onOpenCountChange }: { onOpenCountChange?: (n: number) => void }) => {
    useEffect(() => onOpenCountChange?.(3), [onOpenCountChange]);
    return <div data-testid="tasks" />;
  },
}));
vi.mock("@/components/leads/profile/EnquiryHistory", () => ({
  EnquiryHistory: ({ onCountChange }: { onCountChange?: (n: number) => void }) => {
    useEffect(() => onCountChange?.(2), [onCountChange]);
    return <div data-testid="enquiries" />;
  },
}));
vi.mock("@/components/leads/profile/ActivityTimeline", () => ({
  ActivityTimeline: ({ onCountChange }: { onCountChange?: (n: number) => void }) => {
    useEffect(() => onCountChange?.(5), [onCountChange]);
    return <div data-testid="activity" />;
  },
}));
vi.mock("@/components/leads/profile/NoteCaptureForm", () => ({
  NoteCaptureForm: () => <div data-testid="notes" />,
}));

const { LeadProfilePanel } = await import("./LeadProfilePanel");

const lead = {
  id: "00000000-0000-0000-0000-0000000000bb",
  client_name: "Fake Falls Plumbing",
  company: "Fake Falls Plumbing LLC",
  email: "hello@fakefalls.invalid",
  phone: "8175550101",
  website: "fakefalls.invalid",
  physical_address: "101 Invented Way",
  social_google_business: null,
  social_facebook: null,
  social_instagram: null,
  lead_source: "Webhook",
  service_category: "Plumber",
  estimated_revenue: 31500,
  status: "QUOTED",
  outcome: null,
  actual_revenue: null,
  // Far future, so this lead is deliberately NOT overdue — the strip should
  // print a date rather than the Going Cold badge.
  next_action_at: "2099-09-01T15:00:00.000Z",
  is_starred: true,
  ai_brief: null,
  archived: false,
  assigned_to: null,
} as unknown as Lead;

function renderPanel() {
  return render(<LeadProfilePanel lead={lead} onClose={() => {}} highlightTaskId={null} />);
}

describe("LeadProfilePanel — the jump strip", () => {
  it("offers all five sections in the shipped order", async () => {
    renderPanel();

    const strip = screen.getByRole("navigation", { name: "Jump to section" });

    await waitFor(() => {
      const labels = [...strip.querySelectorAll("button")].map((b) => b.textContent);
      expect(labels).toEqual(["Brief", "Tasks3", "Enquiries2", "Activity5", "Notes"]);
    });
  });

  // The counts are the whole reason a jump strip does not read as a tab bar,
  // and their accessible names are the trap: with the label and the number in
  // adjacent spans and only a CSS gap between them, the name computes as the
  // single word "Tasks3". Nothing about that is visible on the page.
  it("names every counted control in words, not as one run-together string", async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Tasks, 3 open" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Enquiries, 2 recorded" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activity, 5 entries" })).toBeInTheDocument();
  });

  // Brief and Notes have nothing to count. A zero would be a number invented
  // for them, which is worse than no number.
  it("prints no count on the two sections that have nothing to count", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: "Brief" })).toHaveTextContent(/^Brief$/);
    expect(screen.getByRole("button", { name: "Notes" })).toHaveTextContent(/^Notes$/);
  });

  it("marks the first section current, as a navigation target and not a toggle", () => {
    renderPanel();

    const brief = screen.getByRole("button", { name: "Brief" });
    expect(brief).toHaveAttribute("aria-current", "true");
    expect(brief).not.toHaveAttribute("aria-pressed");
  });
});

describe("LeadProfilePanel — header and metadata", () => {
  it("puts the four click-to-action shortcuts on the header row as real protocol links", () => {
    renderPanel();

    expect(screen.getByRole("link", { name: "Call" })).toHaveAttribute("href", "tel:8175550101");
    expect(screen.getByRole("link", { name: "Text" })).toHaveAttribute("href", "sms:8175550101");
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      "mailto:hello@fakefalls.invalid",
    );
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps"),
    );
  });

  it("marks a starred lead without spending --accent on it", () => {
    renderPanel();

    // getAttribute("class"), not .className: on an <svg> that property is an
    // SVGAnimatedString object, so a string assertion against it silently
    // measures nothing.
    const star = screen.getByRole("img", { name: "Starred" });
    expect(star.getAttribute("class")).toContain("text-ink-muted");
    expect(star.getAttribute("class")).not.toContain("accent");
  });

  // Every field in the strip has to be a real column on public.leads. The
  // reference design this came from carried loan-shaped fields; three of its
  // four have no column here at all.
  it("shows the four real lead columns, formatted with the tenant's own settings", async () => {
    renderPanel();

    expect(screen.getByText("QUOTED")).toBeInTheDocument();
    expect(screen.getByText("Webhook")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("$31,500")).toBeInTheDocument();
    });
  });

  it("shows a date rather than the Going Cold badge when the lead is not overdue", () => {
    renderPanel();

    expect(screen.queryByText("Overdue")).toBeNull();
  });
});
