// Live RLS/trigger enforcement suite for the leads MEMBER-role restriction
// (migration 20260814120000_leads_member_role_enforcement.sql).
//
// NOT part of `npm test` — run it with `npm run test:rls`. It talks to the real
// Supabase project, because that is the only place the enforcement exists: the
// rule is a BEFORE UPDATE trigger, so a mocked role check would prove nothing
// about whether the database actually rejects the write. This is the same
// disposable-fixture pattern every prior adversarial check in this project has
// used (throwaway users, their own org via the real create_organization_with_
// owner RPC, session-bound anon clients, full teardown) — now a committed,
// re-runnable suite instead of a script written fresh each time.
//
// It creates and then deletes three auth users and one organization. It never
// touches TEKGUYZ or TEKGUYZ Demo data.
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
const ORG_NAME = `RLS Role Enforcement Test ${RUN_ID}`;
const PASSWORD = `Rls-Role-Test-${RUN_ID}!`;

type Role = "OWNER" | "ADMIN" | "MEMBER";

const EMAILS: Record<Role, string> = {
  OWNER: `rls-role-test-owner-${RUN_ID}@example.com`,
  ADMIN: `rls-role-test-admin-${RUN_ID}@example.com`,
  MEMBER: `rls-role-test-member-${RUN_ID}@example.com`,
};

let admin: SupabaseClient;
let orgId: string;
const userIds: Partial<Record<Role, string>> = {};
const sessions: Partial<Record<Role, SupabaseClient>> = {};

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createUser(role: Role): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAILS[role],
    password: PASSWORD,
    email_confirm: true, // pre-confirmed: no email sent, no auth rate limit
    user_metadata: { rls_role_test: RUN_ID, purpose: "disposable RLS test identity" },
  });
  if (error || !data.user) throw new Error(`createUser(${role}) failed: ${error?.message}`);
  return data.user.id;
}

async function signIn(role: Role): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email: EMAILS[role],
    password: PASSWORD,
  });
  if (error) throw new Error(`signIn(${role}) failed: ${error.message}`);
  return client;
}

// Fresh lead per test, written with service-role so the fixture itself is never
// what is under test. `closed`: pre-set the four restricted columns, which is
// what an already-closed lead looks like in production.
let leadSeq = 0;
async function makeLead(closed = false): Promise<string> {
  leadSeq += 1;
  const { data, error } = await admin
    .from("leads")
    .insert({
      organization_id: orgId,
      client_name: `Fixture ${leadSeq}`,
      email: `fixture-${leadSeq}-${RUN_ID}@example.com`,
      estimated_revenue: 1000,
      status: "ACTIVE",
      outcome: closed ? "WON" : null,
      actual_revenue: closed ? 4200 : null,
      closed_at: closed ? "2026-08-01T00:00:00.000Z" : null,
      archived: false,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`makeLead failed: ${error?.message}`);
  return data.id as string;
}

async function readLead(leadId: string) {
  const { data, error } = await admin
    .from("leads")
    .select("client_name, status, archived, outcome, actual_revenue, closed_at")
    .eq("id", leadId)
    .single();
  if (error || !data) throw new Error(`readLead failed: ${error?.message}`);
  return data;
}

// The rejection shape asserted everywhere below: an error is returned (not a
// silent no-op), it carries 42501 (what PostgREST maps to HTTP 403), and it
// carries the trigger's sentinel — so this is the role gate, not an ordinary
// tenant-boundary RLS denial, which uses the same SQLSTATE.
async function expectDenied(role: Role, leadId: string, patch: Record<string, unknown>) {
  const { error } = await sessions[role]!.from("leads").update(patch).eq("id", leadId);
  expect(error, `${role} should have been denied ${JSON.stringify(patch)}`).not.toBeNull();
  expect(error?.code).toBe("42501");
  expect(error?.message).toContain("LEAD_ROLE_DENIED");
}

async function expectAllowed(role: Role, leadId: string, patch: Record<string, unknown>) {
  const { error } = await sessions[role]!.from("leads").update(patch).eq("id", leadId);
  expect(error, `${role} should have been allowed ${JSON.stringify(patch)}`).toBeNull();
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

  for (const role of ["OWNER", "ADMIN", "MEMBER"] as const) {
    userIds[role] = await createUser(role);
  }

  // The org is created through the same RPC real onboarding uses, so the OWNER
  // membership row is genuine rather than hand-inserted.
  sessions.OWNER = await signIn("OWNER");
  const { data: newOrgId, error: rpcError } = await sessions.OWNER.rpc(
    "create_organization_with_owner",
    { p_name: ORG_NAME },
  );
  if (rpcError || !newOrgId) {
    throw new Error(`create_organization_with_owner failed: ${rpcError?.message}`);
  }
  orgId = newOrgId as string;

  // ADMIN/MEMBER rows are service-role inserts: there is no client-side insert
  // path on organization_members by design (only the two SECURITY DEFINER
  // functions write it), and going through a real invite adds nothing here.
  const { error: memberError } = await admin.from("organization_members").insert([
    { organization_id: orgId, user_id: userIds.ADMIN, role: "ADMIN" },
    { organization_id: orgId, user_id: userIds.MEMBER, role: "MEMBER" },
  ]);
  if (memberError) throw new Error(`membership insert failed: ${memberError.message}`);

  sessions.ADMIN = await signIn("ADMIN");
  sessions.MEMBER = await signIn("MEMBER");
});

afterAll(async () => {
  if (admin && orgId) {
    // Cascades to organization_members and leads.
    await admin.from("organizations").delete().eq("id", orgId);
  }
  if (admin) {
    for (const role of ["OWNER", "ADMIN", "MEMBER"] as const) {
      const id = userIds[role];
      if (id) await admin.auth.admin.deleteUser(id);
    }
  }
});

describe("leads role enforcement — MEMBER", () => {
  it("can INSERT a lead with every column, restricted four included", async () => {
    const { data, error } = await sessions
      .MEMBER!.from("leads")
      .insert({
        organization_id: orgId,
        client_name: "Member Created",
        email: `member-insert-${RUN_ID}@example.com`,
        phone: "555-0100",
        company: "Acme",
        website: "https://acme.test",
        physical_address: "1 Test St",
        social_google_business: "https://g.test/acme",
        social_facebook: "https://fb.test/acme",
        social_instagram: "https://ig.test/acme",
        lead_source: "Referral",
        service_category: "Roofing",
        estimated_revenue: 5000,
        status: "QUOTED",
        next_action_at: "2026-09-01T00:00:00.000Z",
        ai_brief: "brief",
        is_starred: true,
        // Restricted on UPDATE only — creation stays unrestricted by design.
        outcome: "WON",
        actual_revenue: 5500,
        closed_at: "2026-08-10T00:00:00.000Z",
        archived: true,
      })
      .select("id, outcome, actual_revenue, archived")
      .single();

    expect(error).toBeNull();
    expect(data?.outcome).toBe("WON");
    expect(Number(data?.actual_revenue)).toBe(5500);
    expect(data?.archived).toBe(true);
  });

  it("can UPDATE every unrestricted column in one statement", async () => {
    const leadId = await makeLead();
    await expectAllowed("MEMBER", leadId, {
      client_name: "Renamed By Member",
      email: `renamed-${RUN_ID}@example.com`,
      phone: "555-0199",
      company: "Renamed Co",
      website: "https://renamed.test",
      physical_address: "2 Test Ave",
      social_google_business: "https://g.test/renamed",
      social_facebook: "https://fb.test/renamed",
      social_instagram: "https://ig.test/renamed",
      lead_source: "Webhook",
      service_category: "Plumbing",
      estimated_revenue: 7500,
      status: "DISCOVERY",
      next_action_at: "2026-10-01T00:00:00.000Z",
      ai_brief: "member-written brief",
      is_starred: true,
    });

    const row = await readLead(leadId);
    expect(row.client_name).toBe("Renamed By Member");
    expect(row.status).toBe("DISCOVERY");
  });

  it("cannot archive a lead", async () => {
    const leadId = await makeLead();
    await expectDenied("MEMBER", leadId, { archived: true });
    expect((await readLead(leadId)).archived).toBe(false);
  });

  it("cannot unarchive a lead", async () => {
    const leadId = await makeLead();
    await admin.from("leads").update({ archived: true }).eq("id", leadId);
    await expectDenied("MEMBER", leadId, { archived: false, status: "NEW" });
    expect((await readLead(leadId)).archived).toBe(true);
  });

  it("cannot set outcome", async () => {
    const leadId = await makeLead();
    await expectDenied("MEMBER", leadId, { outcome: "WON" });
    expect((await readLead(leadId)).outcome).toBeNull();
  });

  it("cannot set actual_revenue", async () => {
    const leadId = await makeLead(true);
    await expectDenied("MEMBER", leadId, { actual_revenue: 999999 });
    expect(Number((await readLead(leadId)).actual_revenue)).toBe(4200);
  });

  it("cannot set closed_at", async () => {
    const leadId = await makeLead(true);
    await expectDenied("MEMBER", leadId, { closed_at: "2020-01-01T00:00:00.000Z" });
    // Compared as an instant, not a string — PostgREST's timestamptz rendering
    // is not the same text that went in.
    expect(Date.parse(String((await readLead(leadId)).closed_at))).toBe(
      Date.parse("2026-08-01T00:00:00.000Z"),
    );
  });

  it("writes nothing at all when one statement mixes allowed and restricted columns", async () => {
    const leadId = await makeLead();
    await expectDenied("MEMBER", leadId, { client_name: "Should Not Persist", archived: true });

    const row = await readLead(leadId);
    expect(row.client_name).not.toBe("Should Not Persist");
    expect(row.archived).toBe(false);
  });

  // The case that would otherwise break every ordinary MEMBER edit: updateLead()
  // re-sends outcome/actual_revenue/closed_at on every save. Unchanged values
  // must pass, or a MEMBER could not edit a phone number on a closed lead.
  it("can re-send the restricted four unchanged alongside a real edit", async () => {
    const leadId = await makeLead(true);
    await expectAllowed("MEMBER", leadId, {
      client_name: "Edited On A Closed Lead",
      outcome: "WON",
      actual_revenue: 4200,
      closed_at: "2026-08-01T00:00:00.000Z",
      archived: false,
    });
    expect((await readLead(leadId)).client_name).toBe("Edited On A Closed Lead");
  });
});

describe.each(["OWNER", "ADMIN"] as const)("leads role enforcement — %s", (role) => {
  it("can archive and unarchive", async () => {
    const leadId = await makeLead();
    await expectAllowed(role, leadId, { archived: true });
    expect((await readLead(leadId)).archived).toBe(true);
    await expectAllowed(role, leadId, { archived: false, status: "NEW" });
    expect((await readLead(leadId)).archived).toBe(false);
  });

  it("can close a deal — outcome, actual_revenue and closed_at together", async () => {
    const leadId = await makeLead();
    await expectAllowed(role, leadId, {
      outcome: "WON",
      actual_revenue: 12345.67,
      closed_at: "2026-08-14T00:00:00.000Z",
    });

    const row = await readLead(leadId);
    expect(row.outcome).toBe("WON");
    expect(Number(row.actual_revenue)).toBe(12345.67);
    expect(Date.parse(String(row.closed_at))).toBe(Date.parse("2026-08-14T00:00:00.000Z"));
  });

  it("can reopen a closed deal — all three back to null", async () => {
    const leadId = await makeLead(true);
    await expectAllowed(role, leadId, { outcome: null, actual_revenue: null, closed_at: null });

    const row = await readLead(leadId);
    expect(row.outcome).toBeNull();
    expect(row.actual_revenue).toBeNull();
    expect(row.closed_at).toBeNull();
  });
});
