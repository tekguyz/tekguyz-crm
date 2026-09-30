// Live suite: each Guest gets their own Demo Org, and the walls hold (#31).
// Replaces demo-visitor.rls.test.ts, which proved the retired shared
// read-only account.
//
// NOT part of `npm run test:unit` — run it with `npm run test:integration`. It
// talks to the real Supabase project, because the walls are RLS and the create
// function is SECURITY DEFINER SQL, and a mock proves neither.
//
// Two Guests, each made the way the "start demo" action makes one: an auth
// user from the admin API, then create_demo_org with the Sample Data. No new
// RLS policy walls them off; the existing membership-scoped policies do. This
// suite is the proof.
//
// FIXTURES. Guest emails are `demo-it-<run>-…@tekguyz-crm.test`. They must
// start `demo-`, because create_demo_org accepts only a Guest, and `demo-it-`
// marks them as this suite's. afterAll deletes both orgs and all users. If a
// run dies in setup, sweep by hand (select first):
//   select email from auth.users where email like 'demo-it-%@tekguyz-crm.test';
// The daily cleanup cron also removes them after 7 days.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildSampleData } from "@/lib/demo/sample-data";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY!;

const RUN_ID = Math.random().toString(36).slice(2, 10);
const PASSWORD = `It-${RUN_ID}-Aa1!`;
const emailFor = (who: string) => `demo-it-${RUN_ID}-${who}@tekguyz-crm.test`;

type Guest = { userId: string; orgId: string; client: SupabaseClient };

let admin: SupabaseClient;
const userIds: string[] = [];
const orgIds: string[] = [];
let a: Guest;
let b: Guest;

const anonClient = () =>
  createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function makeUser(who: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: emailFor(who),
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser(${who}) failed: ${error?.message}`);
  userIds.push(data.user.id);
  return data.user.id;
}

async function makeGuest(who: string): Promise<Guest> {
  const userId = await makeUser(who);
  const { data: orgId, error } = await admin.rpc("create_demo_org", {
    p_user_id: userId,
    p_name: "Demo Workspace",
    p_sample: buildSampleData(new Date()),
  });
  if (error || !orgId) throw new Error(`create_demo_org(${who}) failed: ${error?.message}`);
  orgIds.push(orgId as string);

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email: emailFor(who), password: PASSWORD });
  if (signInError) throw new Error(`signIn(${who}) failed: ${signInError.message}`);
  return { userId, orgId: orgId as string, client };
}

async function firstLeadId(guest: Guest): Promise<string> {
  const { data } = await admin.from("leads").select("id").eq("organization_id", guest.orgId).limit(1).single();
  return data!.id as string;
}

beforeAll(async () => {
  for (const [name, value] of Object.entries({ SUPABASE_URL, ANON_KEY, SERVICE_KEY })) {
    if (!value) throw new Error(`${name} is not set — this suite needs the real project.`);
  }
  admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  a = await makeGuest("a");
  b = await makeGuest("b");
});

afterAll(async () => {
  // Orgs first: every tenant row cascades from the org. Then the users.
  if (orgIds.length) await admin.from("organizations").delete().in("id", orgIds);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
});

describe("create_demo_org", () => {
  it("makes a Demo Org the Guest owns, filled with the Sample Data", async () => {
    const { data: org } = await admin.from("organizations").select("is_demo").eq("id", a.orgId).single();
    expect(org!.is_demo).toBe(true);

    const { data: members } = await admin
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", a.orgId);
    expect(members).toEqual([{ user_id: a.userId, role: "OWNER" }]);

    const count = async (table: string) =>
      (await admin.from(table).select("id", { count: "exact", head: true }).eq("organization_id", a.orgId)).count;
    expect(await count("leads")).toBe(20);
    expect(await count("lead_submissions")).toBe(20);
    expect(await count("tasks")).toBe(8);
    expect(await count("prospects")).toBe(7);
    expect(await count("activity_logs")).toBeGreaterThan(0);
  });

  it("writes nothing when any row is bad", async () => {
    const userId = await makeUser("bad");
    const sample = buildSampleData(new Date());
    const bad = { ...sample, tasks: [{ ...sample.tasks[0], lead_id: crypto.randomUUID() }] };

    const { error } = await admin.rpc("create_demo_org", { p_user_id: userId, p_name: "Demo Workspace", p_sample: bad });

    expect(error).not.toBeNull();
    const { count } = await admin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    expect(count).toBe(0);
  });

  it("refuses a signed-in user and an anonymous caller", async () => {
    const payload = { p_user_id: a.userId, p_name: "Demo Workspace", p_sample: buildSampleData(new Date()) };
    for (const caller of [a.client, anonClient()]) {
      const { data, error } = await caller.rpc("create_demo_org", payload);
      expect(data).toBeNull();
      expect(error?.message).toMatch(/permission denied/i);
    }
  });

  it("refuses the cleanup function to a signed-in user", async () => {
    const { error } = await a.client.rpc("delete_expired_demo_orgs", { p_cutoff: new Date().toISOString() });
    expect(error?.message).toMatch(/permission denied/i);
  });
});

describe("two Guests", () => {
  it("each see only their own Demo Org's leads", async () => {
    for (const [guest, other] of [
      [a, b],
      [b, a],
    ] as const) {
      const { data: leads } = await guest.client.from("leads").select("organization_id");
      expect(leads).toHaveLength(20);
      expect(new Set(leads!.map((l) => l.organization_id))).toEqual(new Set([guest.orgId]));

      const { data: orgs } = await guest.client.from("organizations").select("id");
      expect(orgs!.map((o) => o.id)).toEqual([guest.orgId]);

      const { data: theirs } = await guest.client.from("leads").select("id").eq("id", await firstLeadId(other));
      expect(theirs).toEqual([]);
    }
  });

  it("cannot change or add to the other Guest's Demo Org", async () => {
    const theirLead = await firstLeadId(b);

    const { data: updated } = await a.client
      .from("leads")
      .update({ client_name: "Hijacked" })
      .eq("id", theirLead)
      .select("id");
    expect(updated).toEqual([]);

    const { error } = await a.client.from("leads").insert({
      organization_id: b.orgId,
      client_name: "Planted",
      email: `planted-${RUN_ID}@example.com`,
    });
    expect(error).not.toBeNull();

    const { data: lead } = await admin.from("leads").select("client_name").eq("id", theirLead).single();
    expect(lead!.client_name).not.toBe("Hijacked");
  });

  it("can each create and edit a lead in their own Demo Org", async () => {
    for (const guest of [a, b]) {
      const { data: created, error } = await guest.client
        .from("leads")
        .insert({
          organization_id: guest.orgId,
          client_name: "New Guest Lead",
          email: `guest-lead-${RUN_ID}@example.com`,
        })
        .select("id")
        .single();
      expect(error).toBeNull();

      const { data: edited, error: editError } = await guest.client
        .from("leads")
        .update({ client_name: "Edited Guest Lead", status: "DISCOVERY" })
        .eq("id", created!.id)
        .select("client_name, status")
        .single();
      expect(editError).toBeNull();
      expect(edited).toEqual({ client_name: "Edited Guest Lead", status: "DISCOVERY" });
    }
  });
});
