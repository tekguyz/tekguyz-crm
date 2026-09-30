import { describe, expect, it } from "vitest";
import { buildSampleData } from "@/lib/demo/sample-data";

const NOW = new Date("2026-09-30T15:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function sequentialIds() {
  let n = 0;
  return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
}

describe("buildSampleData", () => {
  const sample = buildSampleData(NOW, sequentialIds());

  it("has the Sample Data counts: 20 leads, one submission each, 8 tasks, 7 prospects", () => {
    expect(sample.leads).toHaveLength(20);
    expect(sample.submissions).toHaveLength(20);
    expect(sample.tasks).toHaveLength(8);
    expect(sample.prospects).toHaveLength(7);
    expect(sample.activity_logs.length).toBeGreaterThan(0);
  });

  it("gives every lead its own id, and every child row names one of them", () => {
    const leadIds = new Set(sample.leads.map((lead) => lead.id));
    expect(leadIds.size).toBe(sample.leads.length);

    for (const row of [...sample.submissions, ...sample.activity_logs, ...sample.tasks]) {
      expect(leadIds.has(row.lead_id)).toBe(true);
    }
  });

  it("resolves every date against the time of the press", () => {
    const marcus = sample.leads.find((lead) => lead.client_name === "Marcus Rivera")!;
    expect(marcus.created_at).toBe(new Date(NOW.getTime() - 6 * DAY).toISOString());
    expect(marcus.next_action_at).toBe(new Date(NOW.getTime() - 2 * DAY).toISOString());
    expect(marcus.closed_at).toBeNull();

    const submission = sample.submissions.find((row) => row.lead_id === marcus.id)!;
    expect(submission.created_at).toBe(marcus.created_at);
  });

  it("hangs each task off the lead at its index in the lead list", () => {
    const roofing = sample.tasks.find((task) => task.title === "Send revised roofing quote")!;
    expect(roofing.lead_id).toBe(sample.leads[0].id);
  });

  it("carries the enquiry text from the lead's webhook log into its submission", () => {
    const marcus = sample.leads.find((lead) => lead.client_name === "Marcus Rivera")!;
    const submission = sample.submissions.find((row) => row.lead_id === marcus.id)!;
    expect(submission.message).toMatch(/Hail damage/);

    const tyler = sample.leads.find((lead) => lead.client_name === "Tyler Brooks")!;
    expect(sample.submissions.find((row) => row.lead_id === tyler.id)!.message).toBeNull();
  });

  it("makes fresh lead ids on every press", () => {
    const again = buildSampleData(NOW);
    expect(again.leads[0].id).not.toBe(buildSampleData(NOW).leads[0].id);
  });
});
