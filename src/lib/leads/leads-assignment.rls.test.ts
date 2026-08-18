// Live enforcement suite for the leads.assigned_to cross-tenant guard
// (migration 20260818120000_leads_assigned_to.sql).
//
// NOT part of `npm test` — run it with `npm run test:rls`. It talks to the real
// Supabase project, because that is the only place the enforcement exists: the
// rule is a BEFORE INSERT OR UPDATE trigger, so a mocked check would prove
// nothing about whether the database actually rejects the write. Same
// disposable-fixture pattern as leads-role-enforcement.rls.test.ts (throwaway
// users, their own orgs via the real create_organization_with_owner RPC,
// session-bound anon clients, full teardown).
//
// It creates and then deletes four auth users and TWO organizations — the
// second org is the whole point, since "cross-tenant" needs a real other
// tenant with a real other member. It never touches TEKGUYZ or TEKGUYZ Demo
// data.
//
// The service-role case matters most. RLS bypass is not trigger bypass, and
// this trigger deliberately has no auth.uid() IS NULL exemption (unlike
// enforce_lead_role_restrictions, which needs one). If that ever regresses,
// the webhook and the seed scripts could write a cross-tenant assignment and
// nothing else in the stack would notice.
//
// If every "rejects" test fails with "expected null not to be null", the
// migration has not been applied yet — that is the pre-migration baseline, not
// a broken suite.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;

const RUN_ID = Math.random().toString(36).slice(2, 10);
const PASSWORD = `Rls-Assign-Test-${RUN_ID}!`;

// HOME_* live in org A. OUTSIDER lives in org B and is never a member of A —
// assigning an org-A lead to OUTSIDER is the violation under test.
type Person = "HOME_OWNER" | "HOME_MEMBER" | "OUTSIDER_OWNER" | "OUTSIDER";

const EMAILS: Record<Person, string> = {
  HOME_OWNER: `rls-assign-owner-${RUN_ID}@example.com`,
  HOME_MEMBER: `rls-assign-member-${RUN_ID}@example.com`,
  OUTSIDER_OWNER: `rls-assign-other-owner-${RUN_ID}@example.com`,
  OUTSIDER: `rls-assign-outsider-${RUN_ID}@example.com`,
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
    user_metadata: { rls_assign_test: RUN_ID, purpose: "disposable RLS test identity" },
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

// Fresh lead in the HOME org per test, written with service-role so the
// fixture itself is never what is under test.
let leadSeq = 0;
async function makeLead(assignedTo: string | null = null): Promise<string> {
  leadSeq += 1;
  const { data, error } = await admin
    .from("leads")
    .insert({
      organization_id: homeOrgId,
      client_name: `Assign Fixture ${leadSeq}`,
      email: `assign-fixture-${leadSeq}-${RUN_ID}@example.com`,
      estimated_revenue: 1000,
      status: "ACTIVE",
      assigned_to: assignedTo,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`makeLead failed: ${error?.message}`);
  return data.id as string;
}

async function readAssignee(leadId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("leads")
    .select("assigned_to")
    .eq("id", leadId)
    .single();
  if (error || !data) throw new Error(`readAssignee failed: ${error?.message}`);
  return data.assigned_to as string | null;
}

// The rejection shape asserted everywhere below: an error is returned (not a
// silent no-op or a silent coercion to NULL), it carries 23514 — check_violation,
// deliberately NOT the 42501 the role trigger uses, so the two stay
// distinguishable — and it carries this trigger's own sentinel.
function expectAssigneeRejection(error: { code?: string; message?: string } | null) {
  expect(error, "the write should have been rejected").not.toBeNull();
  expect(error?.code).toBe("23514");
  expect(error?.message).toContain("LEAD_ASSIGNEE_NOT_MEMBER");
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

  // Both orgs are created through the same RPC real onboarding uses, so each
  // OWNER membership row is genuine rather than hand-inserted.
  sessions.HOME_OWNER = await signIn("HOME_OWNER");
  const { data: homeId, error: homeError } = await sessions.HOME_OWNER.rpc(
    "create_organization_with_owner",
    { p_name: `RLS Assignment Home ${RUN_ID}` },
  );
  if (homeError || !homeId) throw new Error(`home org failed: ${homeError?.message}`);
  homeOrgId = homeId as string;

  sessions.OUTSIDER_OWNER = await signIn("OUTSIDER_OWNER");
  const { data: otherId, error: otherError } = await sessions.OUTSIDER_OWNER.rpc(
    "create_organization_with_owner",
    { p_name: `RLS Assignment Other ${RUN_ID}` },
  );
  if (otherError || !otherId) throw new Error(`other org failed: ${otherError?.message}`);
  otherOrgId = otherId as string;

  // Service-role inserts: there is no client-side insert path on
  // organization_members by design.
  const { error: memberError } = await admin.from("organization_members").insert([
    { organization_id: homeOrgId, user_id: userIds.HOME_MEMBER, role: "MEMBER" },
    { organization_id: otherOrgId, user_id: userIds.OUTSIDER, role: "MEMBER" },
  ]);
  if (memberError) throw new Error(`membership insert failed: ${memberError.message}`);

  sessions.HOME_MEMBER = await signIn("HOME_MEMBER");
  sessions.OUTSIDER = await signIn("OUTSIDER");
});

afterAll(async () => {
  if (admin) {
    // Cascades to organization_members and leads.
    for (const id of [homeOrgId, otherOrgId]) {
      if (id) await admin.from("organizations").delete().eq("id", id);
    }
    for (const person of PEOPLE) {
      const id = userIds[person];
      if (id) await admin.auth.admin.deleteUser(id);
    }
  }
});

describe("lead assignment — allowed, with full role parity", () => {
  it("OWNER can assign a lead to a member of its own org", async () => {
    const leadId = await makeLead();
    const { error } = await sessions
      .HOME_OWNER!.from("leads")
      .update({ assigned_to: userIds.HOME_MEMBER })
      .eq("id", leadId);

    expect(error).toBeNull();
    expect(await readAssignee(leadId)).toBe(userIds.HOME_MEMBER);
  });

  // The parity claim in CLAUDE.md, proven rather than asserted: assignment is
  // deliberately NOT one of the OWNER/ADMIN-only lead columns.
  it("MEMBER can assign a lead, including to themselves", async () => {
    const leadId = await makeLead();
    const { error } = await sessions
      .HOME_MEMBER!.from("leads")
      .update({ assigned_to: userIds.HOME_MEMBER })
      .eq("id", leadId);

    expect(error).toBeNull();
    expect(await readAssignee(leadId)).toBe(userIds.HOME_MEMBER);
  });

  it("MEMBER can assign a lead to the OWNER — ownership is not privilege", async () => {
    const leadId = await makeLead();
    const { error } = await sessions
      .HOME_MEMBER!.from("leads")
      .update({ assigned_to: userIds.HOME_OWNER })
      .eq("id", leadId);

    expect(error).toBeNull();
    expect(await readAssignee(leadId)).toBe(userIds.HOME_OWNER);
  });

  it("MEMBER can clear an assignment back to unassigned", async () => {
    const leadId = await makeLead(userIds.HOME_MEMBER!);
    const { error } = await sessions
      .HOME_MEMBER!.from("leads")
      .update({ assigned_to: null })
      .eq("id", leadId);

    expect(error).toBeNull();
    expect(await readAssignee(leadId)).toBeNull();
  });

  // The trigger's IS DISTINCT FROM fast path. updateLead re-sends assigned_to
  // on every save, so an ordinary edit that does not touch ownership must not
  // pay for a membership lookup or be able to fail one.
  it("an ordinary edit that re-sends the same assignee is unaffected", async () => {
    const leadId = await makeLead(userIds.HOME_MEMBER!);
    const { error } = await sessions
      .HOME_MEMBER!.from("leads")
      .update({ client_name: "Renamed", assigned_to: userIds.HOME_MEMBER })
      .eq("id", leadId);

    expect(error).toBeNull();
  });
});

describe("lead assignment — cross-tenant is rejected", () => {
  it("rejects an UPDATE assigning an org-A lead to an org-B member", async () => {
    const leadId = await makeLead();
    const { error } = await sessions
      .HOME_OWNER!.from("leads")
      .update({ assigned_to: userIds.OUTSIDER })
      .eq("id", leadId);

    expectAssigneeRejection(error);
    // Rejected, not silently coerced: the row is untouched, not set to NULL.
    expect(await readAssignee(leadId)).toBeNull();
  });

  it("rejects the same attempt from a MEMBER", async () => {
    const leadId = await makeLead();
    const { error } = await sessions
      .HOME_MEMBER!.from("leads")
      .update({ assigned_to: userIds.OUTSIDER })
      .eq("id", leadId);

    expectAssigneeRejection(error);
  });

  it("rejects an INSERT that is born cross-tenant", async () => {
    const { error } = await sessions
      .HOME_OWNER!.from("leads")
      .insert({
        organization_id: homeOrgId,
        client_name: "Born Cross Tenant",
        email: `born-cross-${RUN_ID}@example.com`,
        estimated_revenue: 1,
        status: "NEW",
        assigned_to: userIds.OUTSIDER,
      });

    expectAssigneeRejection(error);
  });

  it("rejects assignment to a user id that is in no organization at all", async () => {
    const leadId = await makeLead();
    const { error } = await sessions
      .HOME_OWNER!.from("leads")
      .update({ assigned_to: "00000000-0000-0000-0000-000000000000" })
      .eq("id", leadId);

    expectAssigneeRejection(error);
  });

  // The one that would be invisible if it regressed. Service-role bypasses RLS
  // entirely, so if this trigger ever gained an auth.uid() IS NULL exemption the
  // webhook, the CSV import RPC and the seed scripts could all write a
  // cross-tenant assignment with no error anywhere.
  it("rejects a SERVICE-ROLE cross-tenant write — RLS bypass is not trigger bypass", async () => {
    const leadId = await makeLead();
    const { error } = await admin
      .from("leads")
      .update({ assigned_to: userIds.OUTSIDER })
      .eq("id", leadId);

    expectAssigneeRejection(error);
    expect(await readAssignee(leadId)).toBeNull();
  });

  it("rejects a SERVICE-ROLE cross-tenant INSERT too", async () => {
    const { error } = await admin.from("leads").insert({
      organization_id: homeOrgId,
      client_name: "Service Born Cross Tenant",
      email: `svc-born-cross-${RUN_ID}@example.com`,
      estimated_revenue: 1,
      status: "NEW",
      assigned_to: userIds.OUTSIDER,
    });

    expectAssigneeRejection(error);
  });
});
