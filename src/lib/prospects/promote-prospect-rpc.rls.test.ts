// Live enforcement suite for public.promote_prospect
// (migration 20260914120000_promote_prospect_rpc.sql).
//
// NOT part of `npm test` — run it with `npm run test:rls`. The claim this RPC
// exists to make is a database fact: the leads insert, the lead_submissions
// insert and the guarded prospect claim commit together or not at all, so two
// promotions of one prospect leave exactly one lead and zero orphans. A mock
// cannot prove that; two real calls against the hosted project can.
//
// Same disposable-fixture pattern as prospect-promotion.rls.test.ts: throwaway
// users, their own orgs via create_organization_with_owner, session-bound anon
// clients, full teardown. It never touches TEKGUYZ or TEKGUYZ Demo data.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;

const RUN_ID = Math.random().toString(36).slice(2, 10);
const PASSWORD = `Rls-PromoteRpc-Test-${RUN_ID}!`;

type Person = "HOME_MEMBER" | "OUTSIDER_OWNER" | "HOME_OWNER";

const EMAILS: Record<Person, string> = {
  HOME_OWNER: `rls-promoterpc-owner-${RUN_ID}@example.com`,
  HOME_MEMBER: `rls-promoterpc-member-${RUN_ID}@example.com`,
  OUTSIDER_OWNER: `rls-promoterpc-outsider-${RUN_ID}@example.com`,
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

async function signIn(person: Person): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email: EMAILS[person],
    password: PASSWORD,
  });
  if (error) throw new Error(`signIn(${person}) failed: ${error.message}`);
  return client;
}

let seq = 0;
function nextId(): string {
  seq += 1;
  return `${RUN_ID}-${seq}`;
}

async function makeProspect(organizationId: string): Promise<string> {
  const placeId = `promoterpc-place-${nextId()}`;
  const { data, error } = await admin
    .from("prospects")
    .insert({ organization_id: organizationId, place_id: placeId, name: `Promote ${placeId}` })
    .select("id")
    .single();
  if (error || !data) throw new Error(`makeProspect failed: ${error?.message}`);
  return data.id as string;
}

// The exact argument shape promoteProspect sends.
function promote(client: SupabaseClient, orgId: string, prospectId: string, email: string) {
  return client
    .rpc("promote_prospect", {
      p_org_id: orgId,
      p_prospect_id: prospectId,
      p_client_name: "Rpc Fixture",
      p_email: email,
      p_phone: "555-0100",
      p_company: "Rpc Co",
      p_website: null,
      p_physical_address: "1 Main St",
      p_service_category: "IT",
      p_lead_source: "Cold outreach",
      p_estimated_revenue: 1200,
      p_message: "call notes",
    })
    .single<{ outcome: string; promoted_lead: string }>();
}

async function leadsByEmail(orgId: string, emails: string[]) {
  const { data, error } = await admin
    .from("leads")
    .select("id, email")
    .eq("organization_id", orgId)
    .in("email", emails);
  if (error) throw new Error(error.message);
  return data;
}

async function submissionsFor(leadIds: string[]) {
  const { data, error } = await admin
    .from("lead_submissions")
    .select("lead_id, organization_id, client_name, email, phone, company, message, service_category, lead_source, raw_payload")
    .in("lead_id", leadIds);
  if (error) throw new Error(error.message);
  return data;
}

async function readProspect(prospectId: string) {
  const { data, error } = await admin
    .from("prospects")
    .select("status, promoted_lead_id")
    .eq("id", prospectId)
    .single();
  if (error) throw new Error(error.message);
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
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAILS[person],
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { rls_promoterpc_test: RUN_ID, purpose: "disposable RLS test identity" },
    });
    if (error || !data.user) throw new Error(`createUser(${person}) failed: ${error?.message}`);
    userIds[person] = data.user.id;
  }

  sessions.HOME_OWNER = await signIn("HOME_OWNER");
  const home = await sessions.HOME_OWNER.rpc("create_organization_with_owner", {
    p_name: `RLS PromoteRpc Home ${RUN_ID}`,
  });
  if (home.error || !home.data) throw new Error(`home org failed: ${home.error?.message}`);
  homeOrgId = home.data as string;

  sessions.OUTSIDER_OWNER = await signIn("OUTSIDER_OWNER");
  const other = await sessions.OUTSIDER_OWNER.rpc("create_organization_with_owner", {
    p_name: `RLS PromoteRpc Other ${RUN_ID}`,
  });
  if (other.error || !other.data) throw new Error(`other org failed: ${other.error?.message}`);
  otherOrgId = other.data as string;

  const { error: memberError } = await admin
    .from("organization_members")
    .insert([{ organization_id: homeOrgId, user_id: userIds.HOME_MEMBER, role: "MEMBER" }]);
  if (memberError) throw new Error(`membership insert failed: ${memberError.message}`);

  sessions.HOME_MEMBER = await signIn("HOME_MEMBER");
});

afterAll(async () => {
  if (admin) {
    // Deleted, never archived — CLAUDE.md § Test-Data Cleanup. Cascades to
    // organization_members, leads, lead_submissions and prospects.
    for (const id of [homeOrgId, otherOrgId]) {
      if (id) await admin.from("organizations").delete().eq("id", id);
    }
    for (const person of PEOPLE) {
      const id = userIds[person];
      if (id) await admin.auth.admin.deleteUser(id);
    }
  }
});

describe("promote_prospect writes all three rows together", () => {
  it("a MEMBER promotes: one lead, one record.ts-shaped submission, prospect claimed", async () => {
    const prospectId = await makeProspect(homeOrgId);
    const email = `happy-${nextId()}@example.com`;

    const { data, error } = await promote(sessions.HOME_MEMBER!, homeOrgId, prospectId, email);
    expect(error).toBeNull();
    expect(data?.outcome).toBe("PROMOTED");

    const leads = await leadsByEmail(homeOrgId, [email]);
    expect(leads.map((l) => l.id)).toEqual([data!.promoted_lead]);

    expect(await submissionsFor([data!.promoted_lead])).toEqual([
      {
        lead_id: data!.promoted_lead,
        organization_id: homeOrgId,
        client_name: "Rpc Fixture",
        email,
        phone: "555-0100",
        company: "Rpc Co",
        message: "call notes",
        service_category: "IT",
        lead_source: "Cold outreach",
        raw_payload: null,
      },
    ]);

    expect(await readProspect(prospectId)).toEqual({
      status: "CONVERTED",
      promoted_lead_id: data!.promoted_lead,
    });
  });
});

describe("two promotions of one prospect leave exactly one lead", () => {
  it("back to back: the second returns ALREADY_PROMOTED and inserts nothing", async () => {
    const prospectId = await makeProspect(homeOrgId);
    const a = `seq-a-${nextId()}@example.com`;
    const b = `seq-b-${nextId()}@example.com`;

    const first = await promote(sessions.HOME_MEMBER!, homeOrgId, prospectId, a);
    const second = await promote(sessions.HOME_OWNER!, homeOrgId, prospectId, b);

    expect(first.data?.outcome).toBe("PROMOTED");
    expect(second.error).toBeNull();
    expect(second.data).toEqual({ outcome: "ALREADY_PROMOTED", promoted_lead: first.data!.promoted_lead });

    const leads = await leadsByEmail(homeOrgId, [a, b]);
    expect(leads).toHaveLength(1);
    expect((await readProspect(prospectId)).promoted_lead_id).toBe(first.data!.promoted_lead);
  });

  it("concurrent: exactly one wins, zero orphans, one submission", async () => {
    const prospectId = await makeProspect(homeOrgId);
    const a = `race-a-${nextId()}@example.com`;
    const b = `race-b-${nextId()}@example.com`;

    // Issued together, from two different sessions, so they genuinely overlap
    // on the server rather than queueing behind one client.
    const results = await Promise.all([
      promote(sessions.HOME_MEMBER!, homeOrgId, prospectId, a),
      promote(sessions.HOME_OWNER!, homeOrgId, prospectId, b),
    ]);

    for (const r of results) expect(r.error).toBeNull();
    const outcomes = results.map((r) => r.data!.outcome).sort();
    expect(outcomes).toEqual(["ALREADY_PROMOTED", "PROMOTED"]);

    const winner = results.find((r) => r.data!.outcome === "PROMOTED")!.data!.promoted_lead;
    for (const r of results) expect(r.data!.promoted_lead).toBe(winner);

    const leads = await leadsByEmail(homeOrgId, [a, b]);
    expect(leads.map((l) => l.id)).toEqual([winner]);
    expect(await submissionsFor([winner])).toHaveLength(1);
    expect((await readProspect(prospectId)).promoted_lead_id).toBe(winner);
  });
});

describe("tenant boundary lives in the function body", () => {
  it("an outsider passing the home org id is refused and writes nothing", async () => {
    const prospectId = await makeProspect(homeOrgId);
    const email = `forged-${nextId()}@example.com`;

    const { error } = await promote(sessions.OUTSIDER_OWNER!, homeOrgId, prospectId, email);
    expect(error?.code).toBe("42501");
    expect(error?.message).toContain("PROMOTE_NOT_AUTHORIZED");

    expect(await leadsByEmail(homeOrgId, [email])).toEqual([]);
    expect((await readProspect(prospectId)).promoted_lead_id).toBeNull();
  });

  it("an outsider passing their own org with a home prospect id reads as not found", async () => {
    const prospectId = await makeProspect(homeOrgId);
    const email = `crossid-${nextId()}@example.com`;

    const { error } = await promote(sessions.OUTSIDER_OWNER!, otherOrgId, prospectId, email);
    expect(error?.code).toBe("P0002");

    expect(await leadsByEmail(otherOrgId, [email])).toEqual([]);
    expect((await readProspect(prospectId)).promoted_lead_id).toBeNull();
  });

  it("an unauthenticated caller cannot execute it", async () => {
    const prospectId = await makeProspect(homeOrgId);
    const { error } = await promote(anonClient(), homeOrgId, prospectId, `anon-${nextId()}@example.com`);
    expect(error).not.toBeNull();
    expect((await readProspect(prospectId)).promoted_lead_id).toBeNull();
  });
});

describe("email collision rolls the whole call back", () => {
  it("raises unique_tenant_client_email_ci and leaves the prospect promotable", async () => {
    const email = `taken-${nextId()}@example.com`;
    const firstProspect = await makeProspect(homeOrgId);
    const first = await promote(sessions.HOME_MEMBER!, homeOrgId, firstProspect, email);
    expect(first.data?.outcome).toBe("PROMOTED");

    const prospectId = await makeProspect(homeOrgId);
    const { error } = await promote(sessions.HOME_MEMBER!, homeOrgId, prospectId, email);
    expect(error?.code).toBe("23505");
    expect(error?.message).toContain("unique_tenant_client_email_ci");

    expect(await leadsByEmail(homeOrgId, [email])).toHaveLength(1);
    expect(await submissionsFor([first.data!.promoted_lead])).toHaveLength(1);
    expect((await readProspect(prospectId)).promoted_lead_id).toBeNull();
  });
});
