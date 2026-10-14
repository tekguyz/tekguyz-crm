import { describe, expect, it } from "vitest";

import { comparePipelinePriority, groupLeadsByStatus } from "@/lib/leads/pipeline";
import type { Lead } from "@/lib/leads/queries";
import { leadComparator, sortLeads } from "@/lib/leads/sort";

function lead(overrides: Partial<Lead> & { client_name: string }): Lead {
  return {
    id: overrides.client_name,
    company: null,
    email: null,
    phone: null,
    website: null,
    physical_address: null,
    social_google_business: null,
    social_facebook: null,
    social_instagram: null,
    social_whatsapp: null,
    lead_source: null,
    service_category: null,
    estimated_revenue: 0,
    status: "NEW",
    outcome: null,
    actual_revenue: null,
    next_action_at: "2099-01-01T00:00:00.000Z",
    is_starred: false,
    ai_brief: null,
    archived: false,
    assigned_to: null,
    ...overrides,
  };
}

const names = (leads: Lead[]) => leads.map((l) => l.client_name);

describe("sortLeads", () => {
  it("sorts by name both ways, ignoring case", () => {
    const leads = [lead({ client_name: "bob" }), lead({ client_name: "Ada" }), lead({ client_name: "Carl" })];
    expect(names(sortLeads(leads, "name", "asc"))).toEqual(["Ada", "bob", "Carl"]);
    expect(names(sortLeads(leads, "name", "desc"))).toEqual(["Carl", "bob", "Ada"]);
  });

  it("sorts by stage in pipeline order, not A-Z", () => {
    const leads = [
      lead({ client_name: "a", status: "ACTIVE" }),
      lead({ client_name: "n", status: "NEW" }),
      lead({ client_name: "q", status: "QUOTED" }),
      lead({ client_name: "d", status: "DISCOVERY" }),
    ];
    expect(names(sortLeads(leads, "stage", "asc"))).toEqual(["n", "d", "q", "a"]);
    expect(names(sortLeads(leads, "stage", "desc"))).toEqual(["a", "q", "d", "n"]);
  });

  it("sorts by amount and keeps a missing amount last both ways", () => {
    const leads = [
      lead({ client_name: "none", estimated_revenue: null as unknown as number }),
      lead({ client_name: "low", estimated_revenue: 100 }),
      lead({ client_name: "high", estimated_revenue: 900 }),
    ];
    expect(names(sortLeads(leads, "amount", "asc"))).toEqual(["low", "high", "none"]);
    expect(names(sortLeads(leads, "amount", "desc"))).toEqual(["high", "low", "none"]);
  });

  it("sorts by next action and keeps a missing date last both ways", () => {
    const leads = [
      lead({ client_name: "none", next_action_at: null as unknown as string }),
      lead({ client_name: "late", next_action_at: "2099-06-01T00:00:00.000Z" }),
      lead({ client_name: "soon", next_action_at: "2099-01-01T00:00:00.000Z" }),
    ];
    expect(names(sortLeads(leads, "due", "asc"))).toEqual(["soon", "late", "none"]);
    expect(names(sortLeads(leads, "due", "desc"))).toEqual(["late", "soon", "none"]);
  });

  it("breaks a tie by name, A-Z, in either direction", () => {
    const leads = [lead({ client_name: "Zed", estimated_revenue: 100 }), lead({ client_name: "Abe", estimated_revenue: 100 })];
    expect(names(sortLeads(leads, "amount", "asc"))).toEqual(["Abe", "Zed"]);
    expect(names(sortLeads(leads, "amount", "desc"))).toEqual(["Abe", "Zed"]);
  });

  it("matches comparePipelinePriority for Priority, whatever the direction", () => {
    const leads = [
      lead({ client_name: "big", estimated_revenue: 5000 }),
      lead({ client_name: "starred", is_starred: true }),
      lead({ client_name: "late", next_action_at: "2000-01-01T00:00:00.000Z" }),
    ];
    const expected = names([...leads].sort(comparePipelinePriority));
    expect(names(sortLeads(leads, "priority", "asc"))).toEqual(expected);
    expect(names(sortLeads(leads, "priority", "desc"))).toEqual(expected);
  });

  it("does not mutate the array it is given", () => {
    const leads = [lead({ client_name: "b" }), lead({ client_name: "a" })];
    sortLeads(leads, "name", "asc");
    expect(names(leads)).toEqual(["b", "a"]);
  });
});

describe("groupLeadsByStatus with a comparator", () => {
  it("orders each lane by the comparator it is given", () => {
    const leads = [
      lead({ client_name: "Zed", estimated_revenue: 5000 }),
      lead({ client_name: "Abe", estimated_revenue: 100 }),
    ];
    expect(names(groupLeadsByStatus(leads).NEW)).toEqual(["Zed", "Abe"]);
    expect(names(groupLeadsByStatus(leads, leadComparator("name", "asc")).NEW)).toEqual(["Abe", "Zed"]);
  });
});
