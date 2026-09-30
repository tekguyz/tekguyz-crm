// Live suite: the Demo Org cleanup deletes what it should and nothing else
// (#31). delete_expired_demo_orgs is project-wide, so it is called from THIS
// file only — two files calling it in parallel would delete each other's
// fixtures.
//
// NOT part of `npm run test:unit` — run it with `npm run test:integration`.
//
// FIXTURES. Guests are `demo-it-<run>-…@tekguyz-crm.test` (they must start
// `demo-` to be Guests at all). afterAll removes what is left. If a run dies in
// setup, sweep by hand (select first):
//   select email from auth.users where email like 'demo-it-%@tekguyz-crm.test';
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildSampleData } from "@/lib/demo/sample-data";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY!;
const RUN_ID = Math.random().toString(36).slice(2, 10);
const EIGHT_DAYS_AGO = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

let admin: SupabaseClient;
const userIds: string[] = [];
const orgIds: string[] = [];
let oldGuest: { userId: string; orgId: string };
let newGuest: { userId: string; orgId: string };
let returned: string[];
let realOrgsBefore: string[];
let tekguyzDemoBefore: string | null;

async function makeGuest(who: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email: `demo-it-${RUN_ID}-${who}@tekguyz-crm.test`,
    password: `It-${RUN_ID}-Aa1!`,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser(${who}) failed: ${error?.message}`);
  userIds.push(data.user.id);

  const { data: orgId, error: orgError } = await admin.rpc("create_demo_org", {
    p_user_id: data.user.id,
    p_name: "Demo Workspace",
    p_sample: buildSampleData(new Date()),
  });
  if (orgError || !orgId) throw new Error(`create_demo_org(${who}) failed: ${orgError?.message}`);
  orgIds.push(orgId as string);
  return { userId: data.user.id, orgId: orgId as string };
}

async function orgExists(id: string): Promise<boolean> {
  const { data } = await admin.from("organizations").select("id").eq("id", id).maybeSingle();
  return data !== null;
}

beforeAll(async () => {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("This suite needs the real project (.env).");
  admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: realOrgs } = await admin.from("organizations").select("id").eq("is_demo", false);
  realOrgsBefore = realOrgs!.map((o) => o.id as string).sort();
  const { data: tekguyzDemo } = await admin.from("organizations").select("id").eq("name", "TEKGUYZ Demo").maybeSingle();
  tekguyzDemoBefore = (tekguyzDemo?.id as string | undefined) ?? null;

  oldGuest = await makeGuest("old");
  newGuest = await makeGuest("new");

  // Age one Demo Org past the cutoff. Service role, on a fixture this run made.
  const { error } = await admin.from("organizations").update({ created_at: EIGHT_DAYS_AGO }).eq("id", oldGuest.orgId);
  if (error) throw new Error(`backdating failed: ${error.message}`);

  // What the cron route does, minus the Auth deletes: this suite deletes only
  // the users it made, below.
  const { data, error: cleanupError } = await admin.rpc("delete_expired_demo_orgs", { p_cutoff: SEVEN_DAYS_AGO });
  if (cleanupError) throw new Error(`delete_expired_demo_orgs failed: ${cleanupError.message}`);
  returned = (data as { guest_user_id: string }[]).map((r) => r.guest_user_id);
});

afterAll(async () => {
  if (orgIds.length) await admin.from("organizations").delete().in("id", orgIds);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
});

describe("delete_expired_demo_orgs", () => {
  it("deletes a Demo Org older than 7 days, with every row it owned", async () => {
    expect(await orgExists(oldGuest.orgId)).toBe(false);
    const { count } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", oldGuest.orgId);
    expect(count).toBe(0);
  });

  it("hands back that Demo Org's Guest, for the route to delete", () => {
    expect(returned).toContain(oldGuest.userId);
  });

  it("leaves a new Demo Org and its Guest alone", async () => {
    expect(await orgExists(newGuest.orgId)).toBe(true);
    expect(returned).not.toContain(newGuest.userId);
  });

  it("never touches TEKGUYZ Demo or a real org", async () => {
    if (tekguyzDemoBefore) expect(await orgExists(tekguyzDemoBefore)).toBe(true);

    const { data: realOrgs } = await admin.from("organizations").select("id").eq("is_demo", false);
    expect(realOrgs!.map((o) => o.id as string).sort()).toEqual(realOrgsBefore);
  });

  it("hands back only Guests", async () => {
    for (const id of returned) {
      const { data } = await admin.auth.admin.getUserById(id);
      expect(data.user?.email ?? "").toMatch(/^demo-.*@tekguyz-crm\.test$/);
    }
  });
});
