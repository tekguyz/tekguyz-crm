// Live enforcement suite for prospect promotion
// (migration 20260826130000_prospects_promotion.sql).
//
// NOT part of `npm test` — run it with `npm run test:rls`. Every guarantee this
// feature rests on is a database fact, and a mocked check would prove none of
// them: that status and promoted_lead_id are written by ONE statement and so
// can never disagree, that `where promoted_lead_id is null` makes a second
// promotion affect zero rows, that unique_tenant_client_email_ci rejects a
// second lead on the same email, and that deleting a lead releases the prospect
// rather than destroying it.
//
// Same disposable-fixture pattern as prospects.rls.test.ts: throwaway users,
// their own orgs via the real create_organization_with_owner RPC, session-bound
// anon clients, full teardown. It never touches TEKGUYZ or TEKGUYZ Demo data.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;

const RUN_ID = Math.random().toString(36).slice(2, 10);
const PASSWORD = `Rls-Promote-Test-${RUN_ID}!`;

type Person = "HOME_OWNER" | "HOME_MEMBER" | "OUTSIDER_OWNER";

const EMAILS: Record<Person, string> = {
  HOME_OWNER: `rls-promote-owner-${RUN_ID}@example.com`,
  HOME_MEMBER: `rls-promote-member-${RUN_ID}@example.com`,
  OUTSIDER_OWNER: `rls-promote-outsider-${RUN_ID}@example.com`,
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
    email_confirm: true,
    user_metadata: { rls_promote_test: RUN_ID, purpose: "disposable RLS test identity" },
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

let seq = 0;
function nextId(): string {
  seq += 1;
  return `${RUN_ID}-${seq}`;
}

// Created through the caller's own session, not service-role, so the leads
// INSERT genuinely passes the "Members create tenant leads" WITH CHECK policy —
// exactly what insertLeadWithSubmission does in the app.
async function makeLead(
  client: SupabaseClient,
  organizationId: string,
  email: string,
): Promise<{ id: string | null; error: { code?: string; message: string } | null }> {
  const { data, error } = await client
    .from("leads")
    .insert({
      organization_id: organizationId,
      client_name: `Promote Fixture ${nextId()}`,
      email,
      estimated_revenue: 0,
      status: "NEW",
    })
    .select("id")
    .single();

  return { id: (data?.id as string | undefined) ?? null, error };
}

async function makeProspect(client: SupabaseClient, organizationId: string): Promise<string> {
  const placeId = `promote-place-${nextId()}`;
  const { data, error } = await client
    .from("prospects")
    .insert({ organization_id: organizationId, place_id: placeId, name: `Promote ${placeId}` })
    .select("id")
    .single();
  if (error || !data) throw new Error(`makeProspect failed: ${error?.message}`);
  return data.id as string;
}

// THE guarded claim, byte-for-byte the statement promoteProspect issues. Kept
// in one helper so no test can accidentally assert against a weaker version of
// it than the app actually runs.
async function claim(client: SupabaseClient, prospectId: string, leadId: string) {
  return client
    .from("prospects")
    .update({ status: "CONVERTED", promoted_lead_id: leadId })
    .eq("id", prospectId)
    .is("promoted_lead_id", null)
    .select("id, status, promoted_lead_id");
}

async function readProspect(prospectId: string) {
  const { data, error } = await admin
    .from("prospects")
    .select("id, status, promoted_lead_id, notes, archived")
    .eq("id", prospectId)
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
    { p_name: `RLS Promote Home ${RUN_ID}` },
  );
  if (homeError || !homeId) throw new Error(`home org failed: ${homeError?.message}`);
  homeOrgId = homeId as string;

  sessions.OUTSIDER_OWNER = await signIn("OUTSIDER_OWNER");
  const { data: otherId, error: otherError } = await sessions.OUTSIDER_OWNER.rpc(
    "create_organization_with_owner",
    { p_name: `RLS Promote Other ${RUN_ID}` },
  );
  if (otherError || !otherId) throw new Error(`other org failed: ${otherError?.message}`);
  otherOrgId = otherId as string;

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

describe("the promotion write is atomic", () => {
  it("sets status and promoted_lead_id together in one statement", async () => {
    const client = sessions.HOME_MEMBER!;
    const prospectId = await makeProspect(client, homeOrgId);
    const { id: leadId } = await makeLead(client, homeOrgId, `promote-${nextId()}@example.com`);

    const { data, error } = await claim(client, prospectId, leadId!);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);

    const row = await readProspect(prospectId);
    expect(row?.status).toBe("CONVERTED");
    expect(row?.promoted_lead_id).toBe(leadId);
  });

  it("a MEMBER can promote — no OWNER/ADMIN gate on prospects", async () => {
    const client = sessions.HOME_MEMBER!;
    const prospectId = await makeProspect(client, homeOrgId);
    const { id: leadId } = await makeLead(client, homeOrgId, `member-${nextId()}@example.com`);

    const { data, error } = await claim(client, prospectId, leadId!);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});

describe("promoting twice is impossible", () => {
  it("a second claim affects ZERO rows and never overwrites the first lead id", async () => {
    const client = sessions.HOME_MEMBER!;
    const prospectId = await makeProspect(client, homeOrgId);
    const { id: firstLead } = await makeLead(client, homeOrgId, `first-${nextId()}@example.com`);
    const { id: secondLead } = await makeLead(client, homeOrgId, `second-${nextId()}@example.com`);

    const first = await claim(client, prospectId, firstLead!);
    expect(first.data).toHaveLength(1);

    // The double-click / race path. This is what promoteProspect branches on to
    // say "already promoted" instead of silently succeeding or throwing.
    const second = await claim(client, prospectId, secondLead!);
    expect(second.error).toBeNull();
    expect(second.data).toEqual([]);

    const row = await readProspect(prospectId);
    expect(row?.promoted_lead_id).toBe(firstLead);
    expect(row?.promoted_lead_id).not.toBe(secondLead);
  });

  // The guard reads promoted_lead_id, never the status string — proving the two
  // are genuinely different questions. A prospect an operator hand-set to a
  // status is still promotable; only a real promotion closes it.
  it("a prospect whose status was set by hand is still promotable", async () => {
    const client = sessions.HOME_MEMBER!;
    const prospectId = await makeProspect(client, homeOrgId);

    await client.from("prospects").update({ status: "CALLED" }).eq("id", prospectId);

    const { id: leadId } = await makeLead(client, homeOrgId, `byhand-${nextId()}@example.com`);
    const { data } = await claim(client, prospectId, leadId!);

    expect(data).toHaveLength(1);
    expect((await readProspect(prospectId))?.promoted_lead_id).toBe(leadId);
  });
});

describe("email collision", () => {
  it("rejects a second lead on the same email with unique_tenant_client_email_ci", async () => {
    const client = sessions.HOME_MEMBER!;
    const email = `collision-${nextId()}@example.com`;

    const first = await makeLead(client, homeOrgId, email);
    expect(first.error).toBeNull();

    const second = await makeLead(client, homeOrgId, email);
    expect(second.error).not.toBeNull();
    expect(second.error?.code).toBe("23505");
    expect(second.error?.message).toContain("unique_tenant_client_email_ci");
  });

  it("is case-insensitive, which is why the app lowercases before inserting", async () => {
    const client = sessions.HOME_MEMBER!;
    const email = `MixedCase-${nextId()}@Example.com`;

    expect((await makeLead(client, homeOrgId, email.toLowerCase())).error).toBeNull();
    const second = await makeLead(client, homeOrgId, email);
    expect(second.error?.code).toBe("23505");
  });

  it("is scoped per tenant — the same email is fine in another org", async () => {
    const email = `cross-${nextId()}@example.com`;

    expect((await makeLead(sessions.HOME_MEMBER!, homeOrgId, email)).error).toBeNull();
    expect((await makeLead(sessions.OUTSIDER_OWNER!, otherOrgId, email)).error).toBeNull();
  });
});

describe("the new columns are tenant-scoped like every other one", () => {
  it("an outsider cannot claim another tenant's prospect", async () => {
    const prospectId = await makeProspect(sessions.HOME_MEMBER!, homeOrgId);
    const { id: leadId } = await makeLead(
      sessions.OUTSIDER_OWNER!,
      otherOrgId,
      `outsider-${nextId()}@example.com`,
    );

    // RLS turns this into zero rows rather than an error — the correct amount
    // to reveal about a row in a tenant you are not in.
    const { data, error } = await claim(sessions.OUTSIDER_OWNER!, prospectId, leadId!);
    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect((await readProspect(prospectId))?.promoted_lead_id).toBeNull();
  });

  it("an outsider cannot read or write another tenant's notes", async () => {
    const prospectId = await makeProspect(sessions.HOME_MEMBER!, homeOrgId);
    await sessions
      .HOME_MEMBER!.from("prospects")
      .update({ notes: "home tenant note" })
      .eq("id", prospectId);

    const { data: read } = await sessions
      .OUTSIDER_OWNER!.from("prospects")
      .select("id, notes")
      .eq("id", prospectId);
    expect(read).toEqual([]);

    await sessions
      .OUTSIDER_OWNER!.from("prospects")
      .update({ notes: "outsider note" })
      .eq("id", prospectId);
    expect((await readProspect(prospectId))?.notes).toBe("home tenant note");
  });

  it("a MEMBER can write notes and archive in their own tenant", async () => {
    const client = sessions.HOME_MEMBER!;
    const prospectId = await makeProspect(client, homeOrgId);

    await client.from("prospects").update({ notes: "call after 4" }).eq("id", prospectId);
    await client.from("prospects").update({ archived: true }).eq("id", prospectId);

    const row = await readProspect(prospectId);
    expect(row?.notes).toBe("call after 4");
    expect(row?.archived).toBe(true);
  });

  // The no-hard-deletes rule, re-confirmed after this migration: archived is
  // still the only removal lever, and prospects still has no DELETE grant.
  it("still refuses a DELETE from an authenticated caller", async () => {
    const client = sessions.HOME_MEMBER!;
    const prospectId = await makeProspect(client, homeOrgId);

    await client.from("prospects").delete().eq("id", prospectId);
    expect(await readProspect(prospectId)).not.toBeNull();
  });
});

describe("ON DELETE SET NULL releases the prospect", () => {
  it("deleting the lead clears promoted_lead_id and does not delete the prospect", async () => {
    const client = sessions.HOME_MEMBER!;
    const prospectId = await makeProspect(client, homeOrgId);
    const { id: leadId } = await makeLead(client, homeOrgId, `released-${nextId()}@example.com`);
    await claim(client, prospectId, leadId!);

    // Service-role: there is no client-side delete path on leads by design.
    await admin.from("leads").delete().eq("id", leadId!);

    const row = await readProspect(prospectId);
    expect(row).not.toBeNull();
    expect(row?.promoted_lead_id).toBeNull();

    // And it is promotable again, which is the honest outcome — the record that
    // this business was called survives the lead being removed.
    const { id: newLead } = await makeLead(client, homeOrgId, `again-${nextId()}@example.com`);
    const { data } = await claim(client, prospectId, newLead!);
    expect(data).toHaveLength(1);
  });
});
