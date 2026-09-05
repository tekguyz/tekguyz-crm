import { describe, expect, it, vi } from "vitest";

import { LEAD_COLUMNS, type Lead } from "@/lib/leads/queries";
import {
  LEAD_EXPORT_COLUMNS,
  leadsCsvFilename,
  leadsToCsv,
} from "@/lib/leads/export-csv";

function lead(overrides: Partial<Lead> & { id: string }): Lead {
  return {
    client_name: "Ada Lovelace",
    company: "Analytical Engines",
    email: `${overrides.id}@example.invalid`,
    phone: "+1 817 555 0142",
    website: "https://example.invalid",
    physical_address: "1 Nowhere St, Fort Worth, TX",
    social_google_business: null,
    social_facebook: null,
    social_instagram: null,
    lead_source: "webhook",
    service_category: "Plumbing",
    estimated_revenue: 1200,
    status: "NEW",
    outcome: null,
    actual_revenue: null,
    next_action_at: "2026-09-06T12:00:00.000Z",
    is_starred: false,
    ai_brief: null,
    archived: false,
    assigned_to: null,
    ...overrides,
  };
}

describe("LEAD_EXPORT_COLUMNS", () => {
  // The whole point of the constant. If a column is ever added to
  // LEAD_COLUMNS, the export gains it automatically and this test proves it —
  // a hand-written list would drift silently and the export would just quietly
  // stop carrying the new column.
  it("is exactly LEAD_COLUMNS, in order, and is never hand-listed", () => {
    expect(LEAD_EXPORT_COLUMNS).toEqual(LEAD_COLUMNS.split(",").map((c) => c.trim()));
    expect(LEAD_EXPORT_COLUMNS).toContain("assigned_to");
    expect(LEAD_EXPORT_COLUMNS.length).toBeGreaterThan(15);
  });
});

describe("leadsToCsv", () => {
  it("writes the header row from LEAD_COLUMNS", () => {
    const [header] = leadsToCsv([]).split("\r\n");
    expect(header).toBe(LEAD_EXPORT_COLUMNS.join(","));
  });

  it("writes one row per lead, in column order", () => {
    const rows = leadsToCsv([lead({ id: "a" }), lead({ id: "b" })])
      .trimEnd()
      .split("\r\n");

    expect(rows).toHaveLength(3); // header + 2
    const idIndex = LEAD_EXPORT_COLUMNS.indexOf("id");
    expect(rows[1].split(",")[idIndex]).toBe("a");
    expect(rows[2].split(",")[idIndex]).toBe("b");
  });

  it("quotes a value holding a comma, and doubles an embedded quote", () => {
    const csv = leadsToCsv([
      lead({ id: "a", company: 'Smith, Jones & "Co"' }),
    ]);
    expect(csv).toContain('"Smith, Jones & ""Co"""');
  });

  it("keeps a newline inside a quoted field rather than breaking the row", () => {
    const csv = leadsToCsv([lead({ id: "a", ai_brief: "line one\nline two" })]);
    expect(csv).toContain('"line one\nline two"');
    // Still exactly one record: header, then the (multi-line) row.
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(2);
  });

  it("neutralises a formula-shaped value so a spreadsheet cannot execute it", () => {
    // client_name is attacker-supplied through the public webhook, so this is
    // a real path, not a hypothetical one.
    const csv = leadsToCsv([lead({ id: "a", client_name: "=HYPERLINK(\"http://evil\")" })]);
    expect(csv).toContain("\"'=HYPERLINK(");
    expect(csv).not.toMatch(/,=HYPERLINK/);
  });

  it("writes an empty field for null, not the text 'null'", () => {
    const csv = leadsToCsv([lead({ id: "a", company: null, phone: null })]);
    const row = csv.trimEnd().split("\r\n")[1].split(",");
    expect(row[LEAD_EXPORT_COLUMNS.indexOf("company")]).toBe("");
    expect(csv).not.toContain("null");
  });

  it("writes booleans as true/false", () => {
    // physical_address is flattened here on purpose: the fixture's default
    // holds commas, and a naive split(",") below would shift every column
    // after it. That the quoting works is proven by its own test above.
    const csv = leadsToCsv([
      lead({ id: "a", archived: true, is_starred: false, physical_address: "1 Nowhere St" }),
    ]);
    const row = csv.trimEnd().split("\r\n")[1].split(",");
    expect(row[LEAD_EXPORT_COLUMNS.indexOf("archived")]).toBe("true");
    expect(row[LEAD_EXPORT_COLUMNS.indexOf("is_starred")]).toBe("false");
  });
});

describe("leadsCsvFilename", () => {
  it("slugs the org name and stamps the date", () => {
    expect(leadsCsvFilename("TEKGUYZ Demo", new Date("2026-09-05T09:00:00Z"))).toBe(
      "tekguyz-demo-leads-2026-09-05.csv",
    );
  });

  it("falls back rather than producing a nameless file", () => {
    expect(leadsCsvFilename("!!!", new Date("2026-09-05T09:00:00Z"))).toBe(
      "organization-leads-2026-09-05.csv",
    );
  });
});

describe("getLeadsForExport", () => {
  /**
   * Tenant scoping is enforced by RLS, which a unit test cannot exercise — so
   * what is asserted here is the belt-and-braces half the code itself owns:
   * the query names the caller's org explicitly, and it selects LEAD_COLUMNS
   * rather than "*" or a hand-list. A query missing the org filter would still
   * be safe under RLS today and unsafe the moment a policy is edited.
   */
  function mockSupabase(rows: Lead[]) {
    const eqCalls: Array<[string, unknown]> = [];
    const selectCalls: string[] = [];
    const builder = {
      select: vi.fn((columns: string) => {
        selectCalls.push(columns);
        return builder;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        eqCalls.push([column, value]);
        return builder;
      }),
      order: vi.fn(() => Promise.resolve({ data: rows, error: null })),
    };
    return { eqCalls, selectCalls, client: { from: vi.fn(() => builder) }, builder };
  }

  it("selects LEAD_COLUMNS and scopes to the caller's organization", async () => {
    const mine = lead({ id: "mine" });
    const mock = mockSupabase([mine]);

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: () => Promise.resolve(mock.client),
    }));
    vi.resetModules();
    const { getLeadsForExport: subject } = await import("@/lib/leads/export-csv");

    const result = await subject("org-1");

    expect(mock.client.from).toHaveBeenCalledWith("leads");
    expect(mock.selectCalls).toEqual([LEAD_COLUMNS]);
    // The other tenant's org id is never queried, so its rows can never be
    // reached by this code path even before RLS refuses them.
    expect(mock.eqCalls).toEqual([["organization_id", "org-1"]]);
    expect(result).toEqual([mine]);

    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  it("does NOT filter on archived — an export is an archive, not a view", async () => {
    const mock = mockSupabase([]);

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: () => Promise.resolve(mock.client),
    }));
    vi.resetModules();
    const { getLeadsForExport: subject } = await import("@/lib/leads/export-csv");

    await subject("org-1");

    expect(mock.eqCalls.map(([column]) => column)).not.toContain("archived");

    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });
});
