// Live suite for the Muse Lead Pack migration (#37,
// 20260930120000_muse_lead_pack.sql): the channel key functions, the contact
// rule CHECKs, and the new import_leads_chunk.
//
// NOT part of `npm run test:unit` — run it with `npm run test:integration`. The
// claims here are database facts (IMMUTABLE SQL, CHECKs, a SECURITY DEFINER
// RPC that walks rows in order), and a mock proves none of them.
//
// FIXTURES. Two throwaway users, `it-import-<run>-…@tekguyz-crm.test`, each
// with their own org from create_organization_with_owner. afterAll deletes the
// orgs (cascading leads and lead_submissions) and the users. If a run dies in
// setup, sweep by hand (select first):
//   select email from auth.users where email like 'it-import-%@tekguyz-crm.test';
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY!;

const RUN_ID = Math.random().toString(36).slice(2, 10);
const PASSWORD = `It-${RUN_ID}-Aa1!`;
const emailFor = (who: string) => `it-import-${RUN_ID}-${who}@tekguyz-crm.test`;

type Outcome = {
  row_index: number;
  outcome: "INSERTED" | "DUPLICATE" | "REJECTED";
  lead_id: string | null;
  lead_archived: boolean | null;
  reason: string | null;
};

let admin: SupabaseClient;
const userIds: string[] = [];
const orgIds: string[] = [];
let owner: SupabaseClient;
let outsider: SupabaseClient;
let homeOrgId: string;

const anonClient = () =>
  createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function makeMember(who: string): Promise<{ client: SupabaseClient; orgId: string }> {
  const { data, error } = await admin.auth.admin.createUser({
    email: emailFor(who),
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser(${who}) failed: ${error?.message}`);
  userIds.push(data.user.id);

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email: emailFor(who), password: PASSWORD });
  if (signInError) throw new Error(`signIn(${who}) failed: ${signInError.message}`);

  const org = await client.rpc("create_organization_with_owner", { p_name: `IT Import ${who} ${RUN_ID}` });
  if (org.error || !org.data) throw new Error(`org(${who}) failed: ${org.error?.message}`);
  orgIds.push(org.data as string);
  return { client, orgId: org.data as string };
}

// Numbers unique to this run, so a real lead can never match a fixture.
const runDigits = String(parseInt(RUN_ID.slice(0, 6), 36) % 10_000).padStart(4, "0");
const phone = (n: number) => `(305) 55${n} ${runDigits}`;
const phonePlusOne = (n: number) => `+1 305 55${n} ${runDigits}`;
const whatsapp = (n: number) => `https://wa.me/130555${n}${runDigits}`;

async function importRows(client: SupabaseClient, orgId: string, rows: Record<string, unknown>[]) {
  const { data, error } = await client.rpc("import_leads_chunk", { p_organization_id: orgId, p_rows: rows });
  return { outcomes: (data ?? []) as Outcome[], error };
}

const summary = (outcomes: Outcome[]) =>
  outcomes.map((o) => `${o.outcome}${o.reason ? `/${o.reason}` : ""}${o.lead_archived ? "/archived" : ""}`);

beforeAll(async () => {
  for (const [name, value] of Object.entries({ SUPABASE_URL, ANON_KEY, SERVICE_KEY })) {
    if (!value) throw new Error(`${name} is not set — this suite needs the real project.`);
  }
  admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const home = await makeMember("owner");
  owner = home.client;
  homeOrgId = home.orgId;
  outsider = (await makeMember("outsider")).client;
});

afterAll(async () => {
  // Deleted, never archived (docs/VERIFICATION.md § Test-Data Cleanup). Orgs
  // first: leads and lead_submissions cascade from them. Then the users.
  if (orgIds.length) await admin.from("organizations").delete().in("id", orgIds);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
});

describe("channel key functions", () => {
  const cases: [fn: string, input: string, want: string | null][] = [
    ["lead_key_email", "  Owner@Example.COM ", "owner@example.com"],
    ["lead_key_email", "   ", null],
    ["lead_key_phone", "(305) 555-1234", "3055551234"],
    ["lead_key_phone", "+1 305 555 1234", "3055551234"],
    ["lead_key_phone", "https://wa.me/13055551234?text=Hi%20there", "3055551234"],
    ["lead_key_phone", "https://api.whatsapp.com/send?phone=13055551234", "3055551234"],
    ["lead_key_website", "https://www.Example.com/Menu/?a=1#top", "example.com/Menu"],
    ["lead_key_website", "N/A", null],
    ["lead_key_facebook", "https://m.facebook.com/JoesPlumbing/?ref=bookmarks", "facebook.com/joesplumbing"],
    ["lead_key_facebook", "https://web.facebook.com/JoesPlumbing", "facebook.com/joesplumbing"],
    ["lead_key_facebook", "https://fb.com/profile.php?ref=x&id=100064", "facebook.com/profile.php?id=100064"],
    ["lead_key_facebook", "N/A", null],
    ["lead_key_instagram", "https://www.instagram.com/JoesPlumbing/?hl=en", "instagram.com/joesplumbing"],
    ["lead_key_instagram", "https://www.instagram.com/p/C0abc/", null],
    ["lead_key_google", "https://www.google.com/maps/search/?api=1&query=Joes+Plumbing", null],
    [
      "lead_key_google",
      "https://www.google.com/maps/search/?api=1&query=Joes&query_place_id=ChIJAbC-1_x",
      "place_id:ChIJAbC-1_x",
    ],
    ["lead_key_google", "https://maps.google.com/?cid=12345", "cid:12345"],
    ["lead_key_google", "https://www.google.com/maps/place/Joes+Plumbing", null],
  ];

  it.each(cases)("%s(%j) is %j", async (fn, input, want) => {
    const { data, error } = await admin.rpc(fn, { p: input });
    expect(error).toBeNull();
    expect(data).toBe(want);
  });
});

describe("the contact rule CHECKs", () => {
  it("accepts a phone-only lead with no email, and stores email as NULL", async () => {
    const { data, error } = await admin
      .from("leads")
      .insert({ organization_id: homeOrgId, client_name: "Check Phone Only", phone: phone(9) })
      .select("email")
      .single();
    expect(error).toBeNull();
    expect(data!.email).toBeNull();
  });

  it("refuses a lead with no Contact Channel", async () => {
    const { error } = await admin.from("leads").insert({ organization_id: homeOrgId, client_name: "Check None" });
    expect(error?.code).toBe("23514");
    expect(error?.message).toContain("check_lead_has_contact_channel");
  });

  it("refuses a blank name", async () => {
    const { error } = await admin
      .from("leads")
      .insert({ organization_id: homeOrgId, client_name: "  ", phone: phone(8) });
    expect(error?.message).toContain("check_lead_name_not_blank");
  });

  it("refuses an empty-string email: a missing email is NULL", async () => {
    const { error } = await admin
      .from("leads")
      .insert({ organization_id: homeOrgId, client_name: "Check Blank Email", email: "", phone: phone(7) });
    expect(error?.message).toContain("check_lead_email_not_blank");
  });

  it("lets two hand-made leads share a phone: the key indexes are not unique", async () => {
    const shared = `(786) 555-${runDigits}`;
    const { error } = await admin.from("leads").insert([
      { organization_id: homeOrgId, client_name: "Shared A", phone: shared },
      { organization_id: homeOrgId, client_name: "Shared B", phone: shared },
    ]);
    expect(error).toBeNull();
  });
});

describe("import_leads_chunk", () => {
  const pack = [
    { client_name: "LJ Air Conditioning Services, Inc.", phone: phone(1), ai_brief: "Hi LJ,\nline two" },
    { client_name: "WhatsApp Only Co", social_whatsapp: whatsapp(2) },
    { client_name: "No Channel Co" },
    { client_name: "Same Phone, Other Format", phone: phonePlusOne(1) },
    { client_name: "LJ Air Conditioning Services, Inc.", phone: phone(3) },
    { client_name: "WhatsApp Matches A Phone", social_whatsapp: whatsapp(3) },
    { client_name: "Insta Co", social_instagram: `https://instagram.com/ItImport${RUN_ID}` },
    { client_name: "Emailer Co", email: `  Lead-${RUN_ID}@Example.COM ` },
  ];

  let first: Outcome[];

  beforeAll(async () => {
    const { outcomes, error } = await importRows(owner, homeOrgId, pack);
    if (error) throw new Error(`first import failed: ${error.message}`);
    first = outcomes;
  });

  it("returns one outcome per row, by index, in file order", () => {
    expect(first.map((o) => o.row_index)).toEqual(pack.map((_, i) => i));
    expect(summary(first)).toEqual([
      "INSERTED", // phone only
      "INSERTED", // WhatsApp only
      "REJECTED/NO_CONTACT_CHANNEL",
      "DUPLICATE", // row 0's phone, written differently: caught inside the file
      "INSERTED", // same name as row 0, other phone: a name alone never matches
      "DUPLICATE", // WhatsApp number equals row 4's phone
      "INSERTED",
      "INSERTED",
    ]);
    expect(first[3].lead_id).toBe(first[0].lead_id);
    expect(first[5].lead_id).toBe(first[4].lead_id);
  });

  it("stores blanks as NULL, the email in key form, and the brief's line breaks", async () => {
    const { data } = await admin
      .from("leads")
      .select("id, email, social_whatsapp, ai_brief")
      .in("id", [first[0].lead_id, first[1].lead_id, first[7].lead_id]);
    const byId = new Map(data!.map((row) => [row.id, row]));
    expect(byId.get(first[0].lead_id)).toMatchObject({ email: null, ai_brief: "Hi LJ,\nline two" });
    expect(byId.get(first[1].lead_id)).toMatchObject({ email: null, social_whatsapp: whatsapp(2) });
    expect(byId.get(first[7].lead_id)).toMatchObject({ email: `lead-${RUN_ID}@example.com` });
  });

  it("writes one first submission per inserted lead, email or not", async () => {
    const inserted = first.filter((o) => o.outcome === "INSERTED").map((o) => o.lead_id!);
    const { data } = await admin.from("lead_submissions").select("lead_id, email").in("lead_id", inserted);
    expect(data!.map((row) => row.lead_id).sort()).toEqual([...inserted].sort());
    expect(data!.find((row) => row.lead_id === first[0].lead_id)!.email).toBeNull();
  });

  it("re-importing the same file adds zero rows", async () => {
    const { outcomes } = await importRows(owner, homeOrgId, pack);
    expect(outcomes.filter((o) => o.outcome === "INSERTED")).toEqual([]);
    expect(outcomes[2]).toMatchObject({ outcome: "REJECTED", reason: "NO_CONTACT_CHANNEL" });
  });

  it("skips a row whose only match is its Instagram link, and leaves an archived match archived", async () => {
    await admin.from("leads").update({ archived: true }).eq("id", first[6].lead_id);
    const { outcomes } = await importRows(owner, homeOrgId, [
      {
        client_name: "Totally Different Name",
        social_instagram: `https://www.instagram.com/itimport${RUN_ID}/?hl=en`,
      },
    ]);
    expect(outcomes[0]).toMatchObject({ outcome: "DUPLICATE", lead_id: first[6].lead_id, lead_archived: true });
    const { data } = await admin.from("leads").select("archived").eq("id", first[6].lead_id).single();
    expect(data!.archived).toBe(true);
  });

  it("does not skip a row whose only match is the business name", async () => {
    const { outcomes } = await importRows(owner, homeOrgId, [
      { client_name: "Insta Co", phone: phone(6) },
    ]);
    expect(outcomes[0].outcome).toBe("INSERTED");
  });

  it("refuses a caller who is not a member of the org", async () => {
    const { error } = await importRows(outsider, homeOrgId, [{ client_name: "Forged", phone: phone(5) }]);
    expect(error?.code).toBe("42501");
  });
});
