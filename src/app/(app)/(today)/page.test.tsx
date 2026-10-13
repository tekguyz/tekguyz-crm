import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// A signed-in `/` is the app's Today screen, never the Landing Page. The
// middleware leaves a signed-in `/` alone (src/lib/supabase/middleware.test.ts);
// this pins what `/` then serves.
vi.mock("@/lib/organizations/current", () => ({
  getCurrentOrg: vi.fn().mockResolvedValue({
    orgId: "org-1",
    orgTimezone: "America/New_York",
    currencyFormat: "USD",
  }),
}));
vi.mock("@/lib/leads/queries", () => ({
  getSlaCriticalLeads: vi.fn().mockResolvedValue([]),
  getHighValueLeads: vi.fn().mockResolvedValue([]),
  getStarredLeads: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/tasks/queries", () => ({
  getTasksDueForOrg: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/leads/spam-review", () => ({
  getLeadsUnderSpamReview: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/components/agenda/TodayAgenda", () => ({
  TodayAgenda: () => <div data-testid="today-agenda" />,
}));

const { default: TodayPage } = await import("./page");

describe("signed-in /", () => {
  it("shows the app's Today screen, not the Landing Page", async () => {
    render(await TodayPage());

    expect(screen.getByTestId("today-agenda")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try the demo" })).toBeNull();
  });
});
