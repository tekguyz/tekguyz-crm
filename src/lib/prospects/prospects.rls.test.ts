// Live enforcement suite for public.prospects and public.import_prospects_chunk
// (migration 20260826120000_prospects.sql).
//
// NOT part of `npm test` — run it with `npm run test:rls`. It talks to the real
// Supabase project, because that is the only place the enforcement exists: RLS
// policies, a SECURITY DEFINER membership check, a GENERATED column and a
// missing DELETE grant are all database facts, and a mocked check would prove
// nothing about any of them.
//
// Same disposable-fixture pattern as leads-assignment.rls.test.ts: throwaway
// users, their own orgs via the real create_organization_with_owner RPC,
// session-bound anon clients, full teardown. It creates and then deletes three
// auth users and TWO organizations — the second org is the whole point, since
// "cross-tenant" needs a real other tenant with a real other member. It never
// touches TEKGUYZ or TEKGUYZ Demo data, and the afterAll delete of both
// organizations cascades to every prospect, lead and membership it created.
//
// If the RPC tests fail with "Could not find the function", the migration has
// not been applied yet — that is the pre-migration baseline, not a broken suite.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;

const RUN_ID = Math.random().toString(36).slice(2, 10);
const PASSWORD = `Rls-Prospect-Test-${RUN_ID}!`;

// HOME_* live in org A. OUTSIDER lives in org B and is never a member of A.
type Person = "HOME_OWNER" | "HOME_MEMBER" | "OUTSIDER_OWNER";

const EMAILS: Record<Person, string> = {
  HOME_OWNER: `rls-prospect-owner-${RUN_ID}@example.com`,
  HOME_MEMBER: `rls-prospect-member-${RUN_ID}@example.com`,
  OUTSIDER_OWNER: `rls-prospect-outsider-${RUN_ID}@example.com`,
};

const PEOPLE = Object.keys(EMAILS) as Person[];

let admin: SupabaseClient;
let homeOrgId: string;
let otherOrgId: string;
const userIds: Partial<Record<Person, string>> = {};
const sessions: Partial<Record<Person, SupabaseClient>> = {};

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createUser(person: Person): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAILS[person],
    password: PASSWORD,
    email_confirm: true, // pre-confirmed: no email sent, no auth rate limit
    user_metadata: { rls_prospect_test: RUN_ID, purpose: "disposable RLS test identity" },
  });
  if (error || !data.user) throw new Error(`createUser(${person}) failed: ${error?.message}`);
  return data.user.id;
}

async function signIn(person: Person): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email: EMAILS[person],
    password: PASSWORD,
  });
  if (error) throw new Error(`signIn(${person}) failed: ${error.message}`);
  return client;
}

// Every place_id is namespaced by RUN_ID so two concurrent runs cannot collide,
// and so nothing here can ever match a real scraped Google Place ID.
let placeSeq = 0;
function nextPlaceId(): string {
  placeSeq += 1;
  return `rls-place-${RUN_ID}-${placeSeq}`;
}

// The minimal row shape the RPC accepts. Only place_id and name are required;
// the rest is what a real leadgen export carries.
function row(overrides: Record<string, unknown> = {}) {
  return {
    place_id: nextPlaceId(),
    name: `RLS Prospect ${placeSeq}`,
    category: "Plumber",
    address: null,
    city: null,
    state: null,
    postal_code: null,
    phone: null,
    website_url: null,
    website_status: "NO_WEBSITE",
    rating: null,
    review_count: null,
    google_maps_url: null,
    niche_searched: "plumber",
    city_searched: "Fort Worth, TX",
    run_id: RUN_ID,
    scraped_at: null,
    ...overrides,
  };
}

// Fixture leads are written with service-role so the fixture itself is never
// what is under test.
let leadSeq = 0;
async function makeLead(organizationId: string, phone: string | null): Promise<string> {
  leadSeq += 1;
  const { data, error } = await admin
    .from("leads")
    .insert({
      organization_id: organizationId,
      client_name: `Prospect Dup Fixture ${leadSeq}`,
      email: `prospect-dup-${leadSeq}-${RUN_ID}@example.com`,
      phone,
      estimated_revenue: 0,
      status: "NEW",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`makeLead failed: ${error?.message}`);
  return data.id as string;
}

async function readProspect(placeId: string) {
  const { data, error } = await admin
    .from("prospects")
    .select("id, organization_id, place_id, phone, phone_digits, status, possible_duplicate_lead_id")
    .eq("place_id", placeId)
    .maybeSingle();
  if (error) throw new Error(`readProspect failed: ${error.message}`);
  return data;
}

beforeAll(async () => {
  const missing = [
    !SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
    !ANON_KEY && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    !SERVICE_KEY && "SUPABASE_SECRET_KEY",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Missing env var(s): ${missing.join(", ")}. Run via \`npm run test:rls\`.`);
  }

  admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const person of PEOPLE) {
    userIds[person] = await createUser(person);
  }

  sessions.HOME_OWNER = await signIn("HOME_OWNER");
  const { data: homeId, error: homeError } = await sessions.HOME_OWNER.rpc(
    "create_organization_with_owner",
    { p_name: `RLS Prospects Home ${RUN_ID}` },
  );
  if (homeError || !homeId) throw new Error(`home org failed: ${homeError?.message}`);
  homeOrgId = homeId as string;

  sessions.OUTSIDER_OWNER = await signIn("OUTSIDER_OWNER");
  const { data: otherId, error: otherError } = await sessions.OUTSIDER_OWNER.rpc(
    "create_organization_with_owner",
    { p_name: `RLS Prospects Other ${RUN_ID}` },
  );
  if (otherError || !otherId) throw new Error(`other org failed: ${otherError?.message}`);
  otherOrgId = otherId as string;

  // Service-role insert: there is no client-side insert path on
  // organization_members by design.
  const { error: memberError } = await admin.from("organization_members").insert([
    { organization_id: homeOrgId, user_id: userIds.HOME_MEMBER, role: "MEMBER" },
  ]);
  if (memberError) throw new Error(`membership insert failed: ${memberError.message}`);

  sessions.HOME_MEMBER = await signIn("HOME_MEMBER");
});

afterAll(async () => {
  if (admin) {
    // Cascades to organization_members, leads and prospects. Deleted, never
    // archived — CLAUDE.md § Test-Data Cleanup: an archived row is still a row.
    for (const id of [homeOrgId, otherOrgId]) {
      if (id) await admin.from("organizations").delete().eq("id", id);
    }
    for (const person of PEOPLE) {
      const id = userIds[person];
      if (id) await admin.auth.admin.deleteUser(id);
    }
  }
});

describe("prospects RLS — a member of the tenant has full parity", () => {
  it("MEMBER can insert a prospect into their own org", async () => {
    const placeId = nextPlaceId();
    const { error } = await sessions
      .HOME_MEMBER!.from("prospects")
      .insert({ organization_id: homeOrgId, place_id: placeId, name: "Member Insert" });

    expect(error).toBeNull();
    expect((await readProspect(placeId))?.organization_id).toBe(homeOrgId);
  });

  it("MEMBER can read and update their own org's prospects", async () => {
    const placeId = nextPlaceId();
    await sessions
      .HOME_MEMBER!.from("prospects")
      .insert({ organization_id: homeOrgId, place_id: placeId, name: "Member Update" });

    const { data: read } = await sessions
      .HOME_MEMBER!.from("prospects")
      .select("id")
      .eq("place_id", placeId);
    expect(read?.length).toBe(1);

    const { error } = await sessions
      .HOME_MEMBER!.from("prospects")
      .update({ status: "CALLED" })
      .eq("place_id", placeId);

    expect(error).toBeNull();
    expect((await readProspect(placeId))?.status).toBe("CALLED");
  });

  it("rejects a status outside the check constraint", async () => {
    const { error } = await sessions.HOME_MEMBER!.from("prospects").insert({
      organization_id: homeOrgId,
      place_id: nextPlaceId(),
      name: "Bad Status",
      status: "DIALLING",
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("23514");
  });
});

describe("prospects RLS — the tenant boundary", () => {
  it("an outsider cannot READ another tenant's prospects", async () => {
    const placeId = nextPlaceId();
    await admin
      .from("prospects")
      .insert({ organization_id: homeOrgId, place_id: placeId, name: "Hidden" });

    // Not an error — RLS filters rather than rejects on SELECT. Zero rows IS
    // the enforcement, which is exactly why it has to be asserted.
    const { data, error } = await sessions
      .OUTSIDER_OWNER!.from("prospects")
      .select("id")
      .eq("place_id", placeId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("an outsider cannot INSERT into another tenant", async () => {
    const { error } = await sessions.OUTSIDER_OWNER!.from("prospects").insert({
      organization_id: homeOrgId,
      place_id: nextPlaceId(),
      name: "Cross Tenant Insert",
    });

    // 42501 — new row violates row-level security policy.
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("an outsider cannot UPDATE another tenant's prospect", async () => {
    const placeId = nextPlaceId();
    await admin
      .from("prospects")
      .insert({ organization_id: homeOrgId, place_id: placeId, name: "Untouchable" });

    await sessions
      .OUTSIDER_OWNER!.from("prospects")
      .update({ status: "NOT_INTERESTED" })
      .eq("place_id", placeId);

    // The USING half filters the row out, so the statement matches nothing.
    // Silence is the pass condition; the row itself is the proof.
    expect((await readProspect(placeId))?.status).toBe("NEW");
  });

  // The paired WITH CHECK, which USING alone cannot express: a member of org A
  // reassigning their own row into org B.
  it("a member cannot move their own prospect into another tenant", async () => {
    const placeId = nextPlaceId();
    await sessions
      .HOME_MEMBER!.from("prospects")
      .insert({ organization_id: homeOrgId, place_id: placeId, name: "Stays Home" });

    const { error } = await sessions
      .HOME_MEMBER!.from("prospects")
      .update({ organization_id: otherOrgId })
      .eq("place_id", placeId);

    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
    expect((await readProspect(placeId))?.organization_id).toBe(homeOrgId);
  });

  // No DELETE grant and no DELETE policy — the app-wide no-hard-deletes rule.
  it("an authenticated user cannot DELETE a prospect at all", async () => {
    const placeId = nextPlaceId();
    await sessions
      .HOME_OWNER!.from("prospects")
      .insert({ organization_id: homeOrgId, place_id: placeId, name: "Undeletable" });

    await sessions.HOME_OWNER!.from("prospects").delete().eq("place_id", placeId);

    // Whether PostgREST reports a grant error or silently matches nothing, the
    // row must survive. That is the claim worth asserting.
    expect(await readProspect(placeId)).not.toBeNull();
  });
});

describe("import_prospects_chunk — the RPC is its own tenant boundary", () => {
  it("an outsider calling it with another org's id is rejected and writes nothing", async () => {
    const payload = row();
    const { error } = await sessions.OUTSIDER_OWNER!.rpc("import_prospects_chunk", {
      p_organization_id: homeOrgId,
      p_rows: [payload],
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("PROSPECT_IMPORT_NOT_AUTHORIZED");
    expect(await readProspect(payload.place_id)).toBeNull();
  });

  it("an anonymous caller is rejected", async () => {
    const payload = row();
    const { error } = await anonClient().rpc("import_prospects_chunk", {
      p_organization_id: homeOrgId,
      p_rows: [payload],
    });

    expect(error).not.toBeNull();
    expect(await readProspect(payload.place_id)).toBeNull();
  });

  // SECURITY DEFINER bypasses RLS, so if the function ever read the tenant id
  // off the row payload the membership check would become decoration. The
  // recordset definition has no organization_id column, so a forged one is
  // structurally unreachable — proven, not asserted.
  it("ignores a forged organization_id on the row payload", async () => {
    const payload = { ...row(), organization_id: otherOrgId };
    const { error } = await sessions.HOME_MEMBER!.rpc("import_prospects_chunk", {
      p_organization_id: homeOrgId,
      p_rows: [payload],
    });

    expect(error).toBeNull();
    expect((await readProspect(payload.place_id))?.organization_id).toBe(homeOrgId);
  });

  it("a MEMBER may import — the check is membership, not role", async () => {
    const payload = row();
    const { data, error } = await sessions.HOME_MEMBER!.rpc("import_prospects_chunk", {
      p_organization_id: homeOrgId,
      p_rows: [payload],
    });

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});

describe("import_prospects_chunk — idempotency on place_id", () => {
  it("re-importing the same rows inserts nothing the second time", async () => {
    const payloads = [row(), row(), row()];

    const first = await sessions.HOME_MEMBER!.rpc("import_prospects_chunk", {
      p_organization_id: homeOrgId,
      p_rows: payloads,
    });
    expect(first.error).toBeNull();
    expect(first.data).toHaveLength(3);

    const second = await sessions.HOME_MEMBER!.rpc("import_prospects_chunk", {
      p_organization_id: homeOrgId,
      p_rows: payloads,
    });
    expect(second.error).toBeNull();
    // Zero returned rows is exactly what the "already present" count is
    // derived from — the caller diffs the chunk against what came back.
    expect(second.data).toHaveLength(0);
  });

  it("DO NOTHING never overwrites an operator's working state", async () => {
    const payload = row({ name: "Original Name" });

    await sessions.HOME_MEMBER!.rpc("import_prospects_chunk", {
      p_organization_id: homeOrgId,
      p_rows: [payload],
    });
    await sessions
      .HOME_MEMBER!.from("prospects")
      .update({ status: "NOT_INTERESTED" })
      .eq("place_id", payload.place_id);

    await sessions.HOME_MEMBER!.rpc("import_prospects_chunk", {
      p_organization_id: homeOrgId,
      p_rows: [{ ...payload, name: "Re-scraped Name" }],
    });

    const stored = await readProspect(payload.place_id);
    expect(stored?.status).toBe("NOT_INTERESTED");
  });

  it("the same place_id may exist in two different tenants", async () => {
    const shared = nextPlaceId();

    const home = await sessions.HOME_MEMBER!.rpc("import_prospects_chunk", {
      p_organization_id: homeOrgId,
      p_rows: [row({ place_id: shared })],
    });
    const other = await sessions.OUTSIDER_OWNER!.rpc("import_prospects_chunk", {
      p_organization_id: otherOrgId,
      p_rows: [row({ place_id: shared })],
    });

    expect(home.error).toBeNull();
    expect(other.error).toBeNull();
    expect(home.data).toHaveLength(1);
    expect(other.data).toHaveLength(1);
  });
});

describe("phone normalization — the generated column and the duplicate hint", () => {
  it("phone_digits strips formatting and a leading country code", async () => {
    const cases: [string, string | null][] = [
      ["(954) 555-9101", "9545559101"],
      ["954-555-9101", "9545559101"],
      ["+1 954 555 9101", "9545559101"],
      ["1-954-555-9101", "9545559101"],
      ["9545559101", "9545559101"],
      // Fewer than ten digits is "not comparable", not "9101" — a 7-digit
      // local number would otherwise false-match every number ending in it.
      ["555-9101", null],
      ["ext 402", null],
    ];

    for (const [raw, expected] of cases) {
      const placeId = nextPlaceId();
      await admin
        .from("prospects")
        .insert({ organization_id: homeOrgId, place_id: placeId, name: "Digits", phone: raw });
      expect((await readProspect(placeId))?.phone_digits, raw).toBe(expected);
    }
  });

  // The headline claim: a formatting difference alone must not hide a match.
  it("flags a prospect whose phone matches an existing lead in a different format", async () => {
    const leadId = await makeLead(homeOrgId, "(954) 555-7788");
    const payload = row({ phone: "9545557788" });

    const { data, error } = await sessions.HOME_MEMBER!.rpc("import_prospects_chunk", {
      p_organization_id: homeOrgId,
      p_rows: [payload],
    });

    expect(error).toBeNull();
    expect(data?.[0]?.duplicate_lead_id).toBe(leadId);
    expect((await readProspect(payload.place_id))?.possible_duplicate_lead_id).toBe(leadId);
  });

  it("matches in the other direction too — raw digits on the lead, formatted on the prospect", async () => {
    const leadId = await makeLead(homeOrgId, "8175552211");
    const payload = row({ phone: "+1 (817) 555-2211" });

    const { data } = await sessions.HOME_MEMBER!.rpc("import_prospects_chunk", {
      p_organization_id: homeOrgId,
      p_rows: [payload],
    });

    expect(data?.[0]?.duplicate_lead_id).toBe(leadId);
  });

  it("leaves the hint null when nothing matches", async () => {
    const payload = row({ phone: "(305) 555-0000" });
    const { data } = await sessions.HOME_MEMBER!.rpc("import_prospects_chunk", {
      p_organization_id: homeOrgId,
      p_rows: [payload],
    });

    expect(data?.[0]?.duplicate_lead_id).toBeNull();
  });

  it("leaves the hint null when the prospect has no phone at all", async () => {
    // A NULL on both sides must not match a NULL-phoned lead — five of the 122
    // real scraped rows have no phone, so this is the common case, not an edge.
    await makeLead(homeOrgId, null);
    const payload = row({ phone: null });

    const { data } = await sessions.HOME_MEMBER!.rpc("import_prospects_chunk", {
      p_organization_id: homeOrgId,
      p_rows: [payload],
    });

    expect(data?.[0]?.duplicate_lead_id).toBeNull();
  });

  // The lookup runs inside a SECURITY DEFINER function, which bypasses RLS. If
  // it were not scoped to p_organization_id it would leak another tenant's
  // phone numbers by oracle — import a number, see whether it comes back
  // flagged.
  it("never matches a lead belonging to a different tenant", async () => {
    await makeLead(otherOrgId, "(786) 555-4433");
    const payload = row({ phone: "(786) 555-4433" });

    const { data } = await sessions.HOME_MEMBER!.rpc("import_prospects_chunk", {
      p_organization_id: homeOrgId,
      p_rows: [payload],
    });

    expect(data?.[0]?.duplicate_lead_id).toBeNull();
  });
});
