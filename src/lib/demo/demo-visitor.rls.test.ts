// Live enforcement suite for the public read-only demo identity
// (migration 20260904120000_demo_readonly_role.sql).
//
// NOT part of `npm test` — run it with `npm run test:rls`. It talks to the
// real Supabase project, because that is the only place the enforcement
// exists: a Postgres role's grants are a database fact, and a mocked check
// would prove nothing about them.
//
// Unlike the other suites in this project, this one deliberately does NOT use
// disposable fixtures for the identity under test. The thing that ships is the
// real seeded demo visitor against the real TEKGUYZ Demo org, and a stand-in
// with the same role would not prove that THIS account is safe. It creates no
// rows on the happy path — every write it attempts is expected to fail — and
// afterAll deletes anything that got through, which would also be a test
// failure.
//
// If the write tests fail by SUCCEEDING, either the migration was not applied
// or the role claim did not land. Run `npm run seed:demo` and check its output
// before touching this file.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
const DEMO_EMAIL = process.env.DEMO_VISITOR_EMAIL;
const DEMO_PASSWORD = process.env.DEMO_VISITOR_PASSWORD;

const DEMO_ORG_NAME = "TEKGUYZ Demo";
const REAL_ORG_NAME = "TEKGUYZ";

// Every write this suite attempts carries this marker, so afterAll can find
// and remove anything that got through. A row bearing it is by definition a
// failed test, not test data.
const PROBE = `rls-demo-probe-${Math.random().toString(36).slice(2, 10)}`;

// Postgres refuses at the grant layer with "permission denied for table x" /
// "permission denied for function x". A row-level refusal would say something
// else entirely, so matching this text is what distinguishes "denied by grant"
// — the mechanism this feature actually relies on — from "denied by policy".
const DENIED = /permission denied/i;

let admin: SupabaseClient;
let demo: SupabaseClient;
let demoOrgId: string;
let realOrgId: string;
let demoUserId: string;
let seededLeadId: string;
let seededTaskId: string | null = null;
let seededProspectId: string;

beforeAll(async () => {
  for (const [name, value] of Object.entries({
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ANON_KEY,
    SUPABASE_SECRET_KEY: SERVICE_KEY,
    DEMO_VISITOR_EMAIL: DEMO_EMAIL,
    DEMO_VISITOR_PASSWORD: DEMO_PASSWORD,
  })) {
    if (!value) throw new Error(`${name} is not set — this suite needs the real project.`);
  }

  admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: orgs, error: orgError } = await admin
    .from("organizations")
    .select("id, name")
    .in("name", [DEMO_ORG_NAME, REAL_ORG_NAME]);
  if (orgError) throw new Error(`Failed to look up orgs: ${orgError.message}`);

  const demoOrg = orgs!.find((o) => o.name === DEMO_ORG_NAME);
  const realOrg = orgs!.find((o) => o.name === REAL_ORG_NAME);
  if (!demoOrg) throw new Error(`"${DEMO_ORG_NAME}" not found — run \`npm run seed:demo\`.`);
  if (!realOrg) throw new Error(`"${REAL_ORG_NAME}" not found — the cross-tenant check needs it.`);
  demoOrgId = demoOrg.id as string;
  realOrgId = realOrg.id as string;

  const { data: lead } = await admin
    .from("leads").select("id").eq("organization_id", demoOrgId).limit(1).single();
  seededLeadId = lead!.id as string;

  const { data: prospect } = await admin
    .from("prospects").select("id").eq("organization_id", demoOrgId).limit(1).single();
  seededProspectId = prospect!.id as string;

  demo = createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: signInError } = await demo.auth.signInWithPassword({
    email: DEMO_EMAIL!,
    password: DEMO_PASSWORD!,
  });
  if (signInError || !session.session) {
    throw new Error(`demo visitor sign-in failed: ${signInError?.message}`);
  }
  demoUserId = session.user!.id;

  // The demo org seeds leads, activity_logs and prospects, but NO tasks — so
  // there is nothing here to aim an UPDATE or DELETE at. Rather than let those
  // tests return early and pass vacuously (which is exactly what happened on
  // the first run of this suite), create one disposable task as a fixture and
  // delete it in afterAll. A test that silently proves nothing is worse than
  // no test at all.
  //
  // Written with the service-role client, and created_by is the demo visitor
  // only because tasks.created_by is NOT NULL with an FK to auth.users — it
  // grants that account nothing, since demo_readonly holds no task privileges.
  // Must run after sign-in, because demoUserId comes from it.
  const { data: fixtureTask, error: fixtureError } = await admin
    .from("tasks")
    .insert({
      organization_id: demoOrgId,
      lead_id: seededLeadId,
      title: `${PROBE}-fixture`,
      due_at: new Date().toISOString(),
      created_by: demoUserId,
    })
    .select("id")
    .single();
  if (fixtureError) throw new Error(`Failed to create fixture task: ${fixtureError.message}`);
  seededTaskId = fixtureTask!.id as string;
});

afterAll(async () => {
  // Only reachable if a write test failed by succeeding. Removing it is part
  // of this unit of work, not a separate cleanup chore — CLAUDE.md's
  // test-data rule makes residue part of the task that created it.
  if (!admin) return;
  await admin.from("activity_logs").delete().eq("content", PROBE);
  await admin.from("prospects").delete().eq("name", PROBE);
  await admin.from("leads").delete().eq("client_name", PROBE);
  // Covers both the beforeAll fixture task and any task a failed write test
  // managed to create — one prefix match rather than two exact matches.
  await admin.from("tasks").delete().like("title", `${PROBE}%`);
});

describe("the mechanism: the demo visitor carries the demo_readonly role", () => {
  it("has role: demo_readonly in its access token, not authenticated", async () => {
    const { data } = await demo.auth.getSession();
    const claims = JSON.parse(
      Buffer.from(data.session!.access_token.split(".")[1], "base64url").toString("utf8"),
    );
    expect(claims.role).toBe("demo_readonly");
  });
});

describe("assertion 1: it can read the seeded demo data", () => {
  it("reads leads", async () => {
    const { data, error } = await demo.from("leads").select("id, client_name");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("reads prospects", async () => {
    const { data, error } = await demo.from("prospects").select("id, name");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("reads activity logs", async () => {
    const { data, error } = await demo.from("activity_logs").select("id, content");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("reads tasks without error", async () => {
    const { error } = await demo.from("tasks").select("id, title");
    expect(error).toBeNull();
  });

  it("reads its own organization", async () => {
    const { data, error } = await demo.from("organizations").select("id, name");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].name).toBe(DEMO_ORG_NAME);
  });
});

describe("assertion 2: every write is denied by the database", () => {
  it("denies INSERT on leads", async () => {
    const { error } = await demo.from("leads").insert({
      organization_id: demoOrgId,
      client_name: PROBE,
      email: `${PROBE}@example.com`,
      status: "NEW",
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(DENIED);
  });

  it("denies UPDATE on leads", async () => {
    const { error } = await demo
      .from("leads").update({ client_name: PROBE }).eq("id", seededLeadId);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(DENIED);
  });

  it("denies DELETE on leads", async () => {
    const { error } = await demo.from("leads").delete().eq("id", seededLeadId);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(DENIED);
  });

  it("denies INSERT on activity_logs", async () => {
    const { error } = await demo.from("activity_logs").insert({
      organization_id: demoOrgId,
      lead_id: seededLeadId,
      log_type: "MANUAL_NOTE",
      content: PROBE,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(DENIED);
  });

  it("denies INSERT on tasks", async () => {
    const { error } = await demo.from("tasks").insert({
      organization_id: demoOrgId,
      lead_id: seededLeadId,
      title: PROBE,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(DENIED);
  });

  it("denies UPDATE on tasks", async () => {
    // Aimed at the fixture task created in beforeAll. Asserting the id is
    // present rather than returning early, so this can never pass vacuously.
    expect(seededTaskId, "fixture task was not created").toBeTruthy();
    const { error } = await demo.from("tasks").update({ title: PROBE }).eq("id", seededTaskId!);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(DENIED);
  });

  it("denies DELETE on tasks", async () => {
    expect(seededTaskId, "fixture task was not created").toBeTruthy();
    const { error } = await demo.from("tasks").delete().eq("id", seededTaskId!);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(DENIED);
  });

  it("denies INSERT on prospects", async () => {
    const { error } = await demo.from("prospects").insert({
      organization_id: demoOrgId,
      place_id: `${PROBE}-place`,
      name: PROBE,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(DENIED);
  });

  it("denies UPDATE on prospects", async () => {
    const { error } = await demo
      .from("prospects").update({ name: PROBE }).eq("id", seededProspectId);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(DENIED);
  });

  it("denies INSERT on lead_submissions", async () => {
    const { error } = await demo.from("lead_submissions").insert({
      organization_id: demoOrgId,
      lead_id: seededLeadId,
      message: PROBE,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(DENIED);
  });

  it("denies UPDATE on organizations", async () => {
    const { error } = await demo
      .from("organizations").update({ name: PROBE }).eq("id", demoOrgId);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(DENIED);
  });

  it("denies UPDATE on its own organization_members row", async () => {
    // authenticated holds a column-level UPDATE grant on the notification
    // preference columns. demo_readonly holds none, so even this is refused.
    const { error } = await demo
      .from("organization_members")
      .update({ notify_new_lead: false })
      .eq("user_id", demoUserId);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(DENIED);
  });

  it("denies every SECURITY DEFINER write RPC", async () => {
    // Policies cannot stop a SECURITY DEFINER function — it runs as its owner.
    // The missing EXECUTE grant is what stops these, which is exactly why this
    // design chose a role over a VIEWER value in organization_members.role.
    const calls: Array<[string, Record<string, unknown>]> = [
      ["import_prospects_chunk", { p_org_id: demoOrgId, p_rows: [] }],
      ["import_leads_chunk", { p_org_id: demoOrgId, p_rows: [] }],
      ["create_organization_with_owner", { p_name: PROBE }],
      ["vault_set_org_credential", { p_org_id: demoOrgId, p_field: "api_key_gemini", p_value: "x" }],
      ["change_member_role", { p_org_id: demoOrgId, p_user_id: demoUserId, p_role: "OWNER" }],
      ["remove_organization_member", { p_org_id: demoOrgId, p_user_id: demoUserId }],
    ];
    for (const [fn, args] of calls) {
      const { error } = await demo.rpc(fn, args);
      expect(error, `${fn} should be denied`).not.toBeNull();
      expect(error!.message, `${fn} error text`).toMatch(/permission denied|does not exist|not find/i);
    }
  });
});

describe("assertion 3: exactly one membership row, not the real org", () => {
  it("holds one organization_members row, in TEKGUYZ Demo", async () => {
    const { data, error } = await admin
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", demoUserId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].organization_id).toBe(demoOrgId);
    expect(data![0].organization_id).not.toBe(realOrgId);
  });
});

describe("assertion 4: it cannot read the webhook secret", () => {
  it("is denied get_org_webhook_secret", async () => {
    const { error } = await demo.rpc("get_org_webhook_secret", { p_org_id: demoOrgId });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied|does not exist|not find/i);
  });

  it("is denied the real org's webhook secret too", async () => {
    const { error } = await demo.rpc("get_org_webhook_secret", { p_org_id: realOrgId });
    expect(error).not.toBeNull();
  });
});

describe("assertion 5: the real TEKGUYZ org is invisible", () => {
  it("returns zero leads for the real org", async () => {
    const { data, error } = await demo
      .from("leads").select("id").eq("organization_id", realOrgId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("returns zero rows for the real org itself", async () => {
    const { data, error } = await demo
      .from("organizations").select("id").eq("id", realOrgId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("returns zero prospects for the real org", async () => {
    const { data, error } = await demo
      .from("prospects").select("id").eq("organization_id", realOrgId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("returns zero activity logs for the real org", async () => {
    const { data, error } = await demo
      .from("activity_logs").select("id").eq("organization_id", realOrgId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
