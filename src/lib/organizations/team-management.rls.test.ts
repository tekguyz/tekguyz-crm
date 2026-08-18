// Live enforcement suite for the two team-management RPCs
// (migration 20260818130000_team_management_rpcs.sql).
//
// NOT part of `npm test` — run it with `npm run test:rls`. Same precedent, and
// the same reason, as leads-role-enforcement.rls.test.ts and
// leads-assignment.rls.test.ts: the rules live in SECURITY DEFINER function
// bodies, so a mocked role check would prove nothing about whether the database
// actually refuses. vitest.rls.config.mts picks this up by its `.rls.test.ts`
// suffix; vitest.config.mts excludes the same pattern from the default run.
//
// It creates and then deletes five auth users and two organizations, plus real
// leads inside them. It never touches TEKGUYZ or TEKGUYZ Demo data.
//
// Fixture shape: HOME org has one OWNER, an ADMIN, a MEMBER, and a SPARE user
// promoted to a second OWNER partway through — the second owner is what proves
// the last-OWNER rule is about the LAST one rather than about owners in
// general. OUTSIDER owns a separate org and is never a member of HOME.
//
// If every "rejects" test fails with "expected null not to be null", the
// migration has not been applied yet — that is the pre-migration baseline, not
// a broken suite.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;

const RUN_ID = Math.random().toString(36).slice(2, 10);
const PASSWORD = `Rls-Team-Test-${RUN_ID}!`;

type Person = "OWNER" | "ADMIN" | "MEMBER" | "SPARE" | "OUTSIDER";

const EMAILS: Record<Person, string> = {
  OWNER: `rls-team-owner-${RUN_ID}@example.com`,
  ADMIN: `rls-team-admin-${RUN_ID}@example.com`,
  MEMBER: `rls-team-member-${RUN_ID}@example.com`,
  SPARE: `rls-team-spare-${RUN_ID}@example.com`,
  OUTSIDER: `rls-team-outsider-${RUN_ID}@example.com`,
};

const PEOPLE = Object.keys(EMAILS) as Person[];

let admin: SupabaseClient;
let homeOrgId: string;
let outsiderOrgId: string;
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
    user_metadata: { rls_team_test: RUN_ID, purpose: "disposable RLS test identity" },
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

function changeRole(actor: Person, target: Person, newRole: string) {
  return sessions[actor]!.rpc("change_member_role", {
    p_org_id: homeOrgId,
    p_target_user_id: userIds[target],
    p_new_role: newRole,
  });
}

function removeMember(actor: Person, target: Person) {
  return sessions[actor]!.rpc("remove_organization_member", {
    p_org_id: homeOrgId,
    p_target_user_id: userIds[target],
  });
}

async function readRole(person: Person): Promise<string | null> {
  const { data } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", homeOrgId)
    .eq("user_id", userIds[person]!)
    .maybeSingle();
  return (data?.role as string | undefined) ?? null;
}

// Every rejection asserts the sentinel, not just "an error happened" — a plain
// RLS denial and a CHECK constraint reuse the same SQLSTATEs, so the code alone
// would not prove WHICH rule fired.
function expectRejection(
  error: { code?: string; message?: string } | null,
  sentinel: string,
  code: string,
) {
  expect(error, `expected ${sentinel}, got no error`).not.toBeNull();
  expect(error?.message).toContain(sentinel);
  expect(error?.code).toBe(code);
}

// Membership is reset before each test so one test's successful mutation can
// never silently set up the next one's result.
async function resetMembership() {
  await admin.from("organization_members").delete().eq("organization_id", homeOrgId);
  const { error } = await admin.from("organization_members").insert([
    { organization_id: homeOrgId, user_id: userIds.OWNER, role: "OWNER" },
    { organization_id: homeOrgId, user_id: userIds.ADMIN, role: "ADMIN" },
    { organization_id: homeOrgId, user_id: userIds.MEMBER, role: "MEMBER" },
    { organization_id: homeOrgId, user_id: userIds.SPARE, role: "MEMBER" },
  ]);
  if (error) throw new Error(`resetMembership failed: ${error.message}`);
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

  // Both orgs come from the same RPC real onboarding uses, so each OWNER
  // membership row is genuine rather than hand-inserted.
  sessions.OWNER = await signIn("OWNER");
  const { data: homeId, error: homeError } = await sessions.OWNER.rpc(
    "create_organization_with_owner",
    { p_name: `RLS Team Home ${RUN_ID}` },
  );
  if (homeError || !homeId) throw new Error(`home org failed: ${homeError?.message}`);
  homeOrgId = homeId as string;

  sessions.OUTSIDER = await signIn("OUTSIDER");
  const { data: outId, error: outError } = await sessions.OUTSIDER.rpc(
    "create_organization_with_owner",
    { p_name: `RLS Team Outsider ${RUN_ID}` },
  );
  if (outError || !outId) throw new Error(`outsider org failed: ${outError?.message}`);
  outsiderOrgId = outId as string;

  for (const person of ["ADMIN", "MEMBER", "SPARE"] as const) {
    sessions[person] = await signIn(person);
  }
});

afterAll(async () => {
  if (admin) {
    // Cascades to organization_members, leads and lead_submissions.
    for (const id of [homeOrgId, outsiderOrgId]) {
      if (id) await admin.from("organizations").delete().eq("id", id);
    }
    for (const person of PEOPLE) {
      const id = userIds[person];
      if (id) await admin.auth.admin.deleteUser(id);
    }
  }
});

beforeEach(resetMembership);

describe("change_member_role — the last OWNER is protected", () => {
  it("rejects the sole OWNER demoting THEMSELVES", async () => {
    const { error } = await changeRole("OWNER", "OWNER", "MEMBER");
    expectRejection(error, "TEAM_LAST_OWNER", "23514");
    expect(await readRole("OWNER")).toBe("OWNER");
  });

  // Proves the rule is about the LAST owner rather than about owners in
  // general. Without this the suite could pass with a much blunter (and wrong)
  // "an owner's role can never change" implementation.
  it("allows the same demotion once a second OWNER exists", async () => {
    const promote = await changeRole("OWNER", "SPARE", "OWNER");
    expect(promote.error).toBeNull();

    const { error } = await changeRole("OWNER", "OWNER", "MEMBER");
    expect(error).toBeNull();
    expect(await readRole("OWNER")).toBe("MEMBER");
    expect(await readRole("SPARE")).toBe("OWNER");
  });
});

describe("change_member_role — an ADMIN may not touch an OWNER", () => {
  it("rejects an ADMIN demoting an OWNER", async () => {
    const { error } = await changeRole("ADMIN", "OWNER", "MEMBER");
    expectRejection(error, "TEAM_ADMIN_CANNOT_MANAGE_OWNER", "42501");
    expect(await readRole("OWNER")).toBe("OWNER");
  });

  it("rejects an ADMIN promoting anyone to OWNER", async () => {
    const { error } = await changeRole("ADMIN", "MEMBER", "OWNER");
    expectRejection(error, "TEAM_ADMIN_CANNOT_GRANT_OWNER", "42501");
    expect(await readRole("MEMBER")).toBe("MEMBER");
  });

  // The gate is specific, not blanket: an ADMIN still manages non-owners.
  it("allows an ADMIN to promote a MEMBER to ADMIN", async () => {
    const { error } = await changeRole("ADMIN", "MEMBER", "ADMIN");
    expect(error).toBeNull();
    expect(await readRole("MEMBER")).toBe("ADMIN");
  });

  it("allows an OWNER to grant OWNER", async () => {
    const { error } = await changeRole("OWNER", "SPARE", "OWNER");
    expect(error).toBeNull();
    expect(await readRole("SPARE")).toBe("OWNER");
  });
});

describe("change_member_role — callers who have no business here", () => {
  it("rejects a MEMBER changing anyone's role", async () => {
    const { error } = await changeRole("MEMBER", "SPARE", "ADMIN");
    expectRejection(error, "TEAM_NOT_AUTHORIZED", "42501");
    expect(await readRole("SPARE")).toBe("MEMBER");
  });

  // The cross-tenant case: a real, valid session for a DIFFERENT org. The org
  // id is an argument, so this is exactly the request a tampered client would
  // send, and the function re-resolving the caller's role for that specific org
  // is what stops it.
  it("rejects an OWNER of another organization entirely", async () => {
    const { error } = await sessions.OUTSIDER!.rpc("change_member_role", {
      p_org_id: homeOrgId,
      p_target_user_id: userIds.MEMBER,
      p_new_role: "OWNER",
    });
    expectRejection(error, "TEAM_NOT_AUTHORIZED", "42501");
    expect(await readRole("MEMBER")).toBe("MEMBER");
  });

  it("rejects a target who is not a member of this organization", async () => {
    const { error } = await sessions.OWNER!.rpc("change_member_role", {
      p_org_id: homeOrgId,
      p_target_user_id: userIds.OUTSIDER,
      p_new_role: "ADMIN",
    });
    expectRejection(error, "TEAM_MEMBER_NOT_FOUND", "23514");
  });
});

describe("remove_organization_member", () => {
  it("rejects removing the sole OWNER, including by themselves", async () => {
    const { error } = await removeMember("OWNER", "OWNER");
    expectRejection(error, "TEAM_LAST_OWNER", "23514");
    expect(await readRole("OWNER")).toBe("OWNER");
  });

  it("rejects an ADMIN removing an OWNER", async () => {
    const { error } = await removeMember("ADMIN", "OWNER");
    expectRejection(error, "TEAM_ADMIN_CANNOT_MANAGE_OWNER", "42501");
    expect(await readRole("OWNER")).toBe("OWNER");
  });

  it("rejects a MEMBER removing somebody else", async () => {
    const { error } = await removeMember("MEMBER", "SPARE");
    expectRejection(error, "TEAM_NOT_AUTHORIZED", "42501");
    expect(await readRole("SPARE")).toBe("MEMBER");
  });

  it("allows an OWNER to remove a MEMBER", async () => {
    const { error } = await removeMember("OWNER", "MEMBER");
    expect(error).toBeNull();
    expect(await readRole("MEMBER")).toBeNull();
  });

  // Self-removal: allowed for a plain MEMBER, who can manage nobody. This is
  // what makes "Leave organization" reachable in the UI.
  it("allows a MEMBER to remove THEMSELVES", async () => {
    const { error } = await removeMember("MEMBER", "MEMBER");
    expect(error).toBeNull();
    expect(await readRole("MEMBER")).toBeNull();
  });
});

describe("remove_organization_member — releases the leaver's leads", () => {
  it("nulls assigned_to on their leads, in the same transaction, and touches nobody else's", async () => {
    // Two leads for the leaver, one for somebody who stays — so the UPDATE is
    // proven to be scoped by assignee rather than sweeping the whole org.
    const rows = [
      { owner: "MEMBER" as const, email: `team-lead-a-${RUN_ID}@example.com` },
      { owner: "MEMBER" as const, email: `team-lead-b-${RUN_ID}@example.com` },
      { owner: "ADMIN" as const, email: `team-lead-c-${RUN_ID}@example.com` },
    ];
    const { data: inserted, error: insertError } = await admin
      .from("leads")
      .insert(
        rows.map((r, i) => ({
          organization_id: homeOrgId,
          client_name: `Team Fixture ${i}`,
          email: r.email,
          estimated_revenue: 100,
          status: "ACTIVE",
          assigned_to: userIds[r.owner],
        })),
      )
      .select("id, email, assigned_to");
    if (insertError) throw new Error(`lead insert failed: ${insertError.message}`);
    expect(inserted).toHaveLength(3);

    // Precondition, read from the database rather than assumed.
    const before = await admin
      .from("leads")
      .select("id")
      .eq("organization_id", homeOrgId)
      .eq("assigned_to", userIds.MEMBER!);
    expect(before.data).toHaveLength(2);

    const { error } = await removeMember("OWNER", "MEMBER");
    expect(error).toBeNull();

    // The leaver's leads are released...
    const after = await admin
      .from("leads")
      .select("id")
      .eq("organization_id", homeOrgId)
      .eq("assigned_to", userIds.MEMBER!);
    expect(after.data).toHaveLength(0);

    // ...the leads themselves still exist (released, not deleted)...
    const stillThere = await admin
      .from("leads")
      .select("id, assigned_to")
      .in(
        "id",
        (inserted ?? []).map((l) => l.id as string),
      );
    expect(stillThere.data).toHaveLength(3);

    // ...and the lead owned by somebody who stayed is untouched.
    const adminsLead = (stillThere.data ?? []).find(
      (l) => l.assigned_to === userIds.ADMIN,
    );
    expect(adminsLead).toBeDefined();

    // And the membership really is gone, so the two halves landed together.
    expect(await readRole("MEMBER")).toBeNull();

    await admin
      .from("leads")
      .delete()
      .in(
        "id",
        (inserted ?? []).map((l) => l.id as string),
      );
  });
});

// The RPCs are not merely the intended path — they are the only one. This is
// the grant, not a policy: authenticated holds SELECT and INSERT on
// organization_members and no UPDATE or DELETE at all.
describe("organization_members stays RPC-only", () => {
  it("refuses a direct client UPDATE of a role", async () => {
    const { data, error } = await sessions
      .OWNER!.from("organization_members")
      .update({ role: "MEMBER" })
      .eq("organization_id", homeOrgId)
      .eq("user_id", userIds.ADMIN!)
      .select("user_id");

    // Either an outright error or zero rows affected — both mean "did not
    // happen". What must never be true is the role actually changing.
    if (!error) expect(data ?? []).toHaveLength(0);
    expect(await readRole("ADMIN")).toBe("ADMIN");
  });

  it("refuses a direct client DELETE of a membership row", async () => {
    const { data, error } = await sessions
      .OWNER!.from("organization_members")
      .delete()
      .eq("organization_id", homeOrgId)
      .eq("user_id", userIds.MEMBER!)
      .select("user_id");

    if (!error) expect(data ?? []).toHaveLength(0);
    expect(await readRole("MEMBER")).toBe("MEMBER");
  });
});
