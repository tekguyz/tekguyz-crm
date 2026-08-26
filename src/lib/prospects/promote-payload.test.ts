import { describe, expect, it } from "vitest";

import {
  PROMOTE_FIELD_NAMES,
  PROMOTED_LEAD_SOURCE,
  buildPromotePayload,
  composeAddress,
  prospectToPromoteDefaults,
} from "@/lib/prospects/promote-payload";

const SOURCE = {
  id: "prospect-1",
  name: "Fake Falls Plumbing",
  category: "Plumber",
  address: "123 Nowhere St",
  city: "Fort Worth",
  state: "TX",
  postal_code: "76102",
  phone: "(817) 555-0142",
  website_url: "https://example.invalid",
  notes: "Gatekeeper. Try after 4pm.",
};

function formOf(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
}

const VALID = {
  prospect_id: "prospect-1",
  client_name: "Dana Rivers",
  email: "Dana@Example.Invalid",
  phone: "(817) 555-0142",
  company: "Fake Falls Plumbing",
  website: "https://example.invalid",
  physical_address: "123 Nowhere St, Fort Worth, TX 76102",
  service_category: "Plumber",
  lead_source: PROMOTED_LEAD_SOURCE,
  estimated_revenue: "2500",
  message: "Spoke to Dana, wants a quote.",
};

describe("Promote form/action field parity", () => {
  // The both-directions diff CLAUDE.md § Form/Action Field Parity requires.
  // Direction 1: every name the action reads is a name the form declares.
  it("reads no field the form does not declare", () => {
    const source = String(buildPromotePayload);
    const readNames = [...source.matchAll(/formData\.get\("([^"]+)"\)/g)].map((m) => m[1]);

    expect(readNames.length).toBeGreaterThan(0);
    for (const name of readNames) {
      expect(PROMOTE_FIELD_NAMES).toContain(name);
    }
  });

  // Direction 2: every name the form declares is a name the action reads.
  // Without this half, a field can be rendered, filled in by a human, and
  // silently dropped on save — the exact shape of the two NULL-on-save
  // incidents this rule exists because of.
  it("declares no field the action never reads", () => {
    const source = String(buildPromotePayload);
    const readNames = new Set(
      [...source.matchAll(/formData\.get\("([^"]+)"\)/g)].map((m) => m[1]),
    );

    for (const name of PROMOTE_FIELD_NAMES) {
      expect(readNames.has(name)).toBe(true);
    }
  });

  // Third direction, the one a name-diff cannot catch: a field can be read and
  // then quietly thrown away instead of written. Every declared field must
  // reach the payload.
  it("carries every declared field through to the payload", () => {
    const result = buildPromotePayload(formOf(VALID));
    if (!result.ok) throw new Error(result.error);

    expect(result.payload.prospectId).toBe("prospect-1");
    expect(result.payload.lead).toEqual({
      clientName: "Dana Rivers",
      email: "dana@example.invalid",
      phone: "(817) 555-0142",
      company: "Fake Falls Plumbing",
      website: "https://example.invalid",
      physicalAddress: "123 Nowhere St, Fort Worth, TX 76102",
      serviceCategory: "Plumber",
      leadSource: PROMOTED_LEAD_SOURCE,
      estimatedRevenue: 2500,
      message: "Spoke to Dana, wants a quote.",
    });
  });
});

describe("buildPromotePayload", () => {
  it("lowercases the email so it matches unique_tenant_client_email_ci", () => {
    const result = buildPromotePayload(formOf({ ...VALID, email: "MIXED@Case.Invalid" }));
    if (!result.ok) throw new Error(result.error);
    expect(result.payload.lead.email).toBe("mixed@case.invalid");
  });

  it("stores an empty optional field as null, never as an empty string", () => {
    const result = buildPromotePayload(
      formOf({ ...VALID, phone: "", website: "   ", message: "" }),
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.payload.lead.phone).toBeNull();
    expect(result.payload.lead.website).toBeNull();
    expect(result.payload.lead.message).toBeNull();
  });

  it("defaults a blank estimated revenue to 0", () => {
    const result = buildPromotePayload(formOf({ ...VALID, estimated_revenue: "" }));
    if (!result.ok) throw new Error(result.error);
    expect(result.payload.lead.estimatedRevenue).toBe(0);
  });

  it("rejects a missing prospect id", () => {
    const result = buildPromotePayload(formOf({ ...VALID, prospect_id: "" }));
    expect(result).toEqual({ ok: false, error: "Missing prospect." });
  });

  it("rejects a missing email", () => {
    const result = buildPromotePayload(formOf({ ...VALID, email: "" }));
    expect(result).toEqual({
      ok: false,
      error: "Contact name and email are required.",
    });
  });

  it("rejects a negative estimated revenue", () => {
    const result = buildPromotePayload(formOf({ ...VALID, estimated_revenue: "-5" }));
    expect(result).toEqual({
      ok: false,
      error: "Estimated revenue must be a positive number.",
    });
  });
});

describe("prospectToPromoteDefaults", () => {
  it("prefills every form field, so nothing is rendered undefined", () => {
    const defaults = prospectToPromoteDefaults(SOURCE);
    for (const name of PROMOTE_FIELD_NAMES) {
      expect(typeof defaults[name]).toBe("string");
    }
  });

  it("leaves email blank — a prospect can never supply one", () => {
    expect(prospectToPromoteDefaults(SOURCE).email).toBe("");
  });

  it("carries the prospect's call notes into the message field", () => {
    expect(prospectToPromoteDefaults(SOURCE).message).toBe("Gatekeeper. Try after 4pm.");
  });
});

describe("composeAddress", () => {
  it("joins the four parts in postal order", () => {
    expect(composeAddress(SOURCE)).toBe("123 Nowhere St, Fort Worth, TX 76102");
  });

  it("skips missing parts instead of leaving a stray comma", () => {
    expect(
      composeAddress({ ...SOURCE, address: null, postal_code: null }),
    ).toBe("Fort Worth, TX");
  });

  it("returns an empty string when nothing is known", () => {
    expect(
      composeAddress({
        ...SOURCE,
        address: null,
        city: null,
        state: null,
        postal_code: null,
      }),
    ).toBe("");
  });
});
