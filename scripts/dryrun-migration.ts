// Dry-runs a migration against session-local temp replicas of the real tables,
// so an agent's migration is verified before a human applies it.
// docs/VERIFICATION.md makes this a standing rule: tsc/eslint/next build
// cannot see SQL at all, so without this a migration is unverified until it
// fails in the human's hands.
//
// Everything here is session-local: `create temp table` and every pg_temp
// function live in pg_temp and disappear when the connection closes. No
// public-schema object is created, altered or written.
//
// Usage: npx tsx --env-file=.env scripts/dryrun-migration.ts
//
// Current target: supabase/migrations/20260929120000_demo_org_per_guest.sql
// (#31). The migration text is read from disk and rewritten so every
// `public.` and `auth.users` reference points at a pg_temp replica. The
// function bodies that run here are therefore the file's own, not a copy.
//
// LIMITATION, stated rather than hidden: `like ... including all` copies
// columns, defaults, generated columns and CHECK constraints, but not foreign
// keys or triggers. The cascades the cleanup relies on are re-created below by
// hand, mirroring the real ON DELETE CASCADE foreign keys. The real grants to
// service_role are verified by the human's apply step and by the integration
// suite.
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { buildSampleData } from "../src/lib/demo/sample-data";

const MIGRATION = "supabase/migrations/20260929120000_demo_org_per_guest.sql";
const TABLES = [
  "organizations",
  "organization_members",
  "leads",
  "lead_submissions",
  "activity_logs",
  "tasks",
  "prospects",
];

const REPLICAS = [
  ...TABLES.map((t) => `create temp table ${t} (like public.${t} including all)`),
  "create temp table users (id uuid primary key, email text, created_at timestamptz not null default now())",
  "alter table pg_temp.organization_members add foreign key (organization_id) references pg_temp.organizations(id) on delete cascade",
  "alter table pg_temp.organization_members add foreign key (user_id) references pg_temp.users(id) on delete cascade",
  ...["leads", "lead_submissions", "activity_logs", "tasks", "prospects"].map(
    (t) =>
      `alter table pg_temp.${t} add foreign key (organization_id) references pg_temp.organizations(id) on delete cascade`,
  ),
  ...["lead_submissions", "activity_logs", "tasks"].map(
    (t) => `alter table pg_temp.${t} add foreign key (lead_id) references pg_temp.leads(id) on delete cascade`,
  ),
];

function toTemp(sql: string): string {
  return sql.replaceAll("auth.users", "pg_temp.users").replaceAll("public.", "pg_temp.");
}

let failures = 0;
function check(label: string, ok: boolean, detail: unknown = "") {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${label}${detail !== "" ? ` — ${JSON.stringify(detail)}` : ""}`);
}

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL is not set in .env — this is a local-only tool var, never a Vercel one.");
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const one = async (sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows[0];
  const raises = async (sql: string, params: unknown[]) => {
    try {
      await client.query("savepoint probe");
      await client.query(sql, params);
      await client.query("release savepoint probe");
      return null;
    } catch (e) {
      await client.query("rollback to savepoint probe");
      return e instanceof Error ? e.message : String(e);
    }
  };

  try {
    await client.query("begin");
    for (const sql of REPLICAS) await client.query(sql);
    await client.query(toTemp(readFileSync(MIGRATION, "utf8")));
    console.log("  OK   migration text applied to pg_temp replicas");

    const guest = "00000000-0000-4000-8000-00000000000a";
    const guest2 = "00000000-0000-4000-8000-00000000000b";
    const orphan = "00000000-0000-4000-8000-00000000000c";
    const real = "00000000-0000-4000-8000-00000000000d";
    await client.query(
      `insert into pg_temp.users (id, email, created_at) values
         ($1, 'demo-dry1@tekguyz-crm.test', now()),
         ($2, 'demo-dry2@tekguyz-crm.test', now()),
         ($3, 'demo-dry3@tekguyz-crm.test', now() - interval '8 days'),
         ($4, 'real.person@example.com', now())`,
      [guest, guest2, orphan, real],
    );

    // A fresh payload per call: each carries its own lead ids, like each press.
    const payload = () => JSON.stringify(buildSampleData(new Date()));
    const create = "select pg_temp.create_demo_org($1, $2, $3::jsonb) as id";

    console.log("\ncreate_demo_org");
    const { id: orgId } = await one(create, [guest, "Demo Workspace", payload()]);
    const counts = await one(
      `select
         (select count(*) from pg_temp.organizations where id = $1 and is_demo) as orgs,
         (select role from pg_temp.organization_members where organization_id = $1 and user_id = $2) as role,
         (select count(*) from pg_temp.leads where organization_id = $1) as leads,
         (select count(*) from pg_temp.lead_submissions where organization_id = $1) as submissions,
         (select count(*) from pg_temp.activity_logs where organization_id = $1) as logs,
         (select count(*) from pg_temp.tasks where organization_id = $1 and created_by = $2) as tasks,
         (select count(*) from pg_temp.prospects where organization_id = $1) as prospects`,
      [orgId, guest],
    );
    check("writes the org, OWNER membership and all Sample Data",
      counts.orgs === "1" && counts.role === "OWNER" && counts.leads === "20" &&
      counts.submissions === "20" && Number(counts.logs) > 0 && counts.tasks === "8" && counts.prospects === "7",
      counts);

    check("refuses a user who is not a Guest",
      /DEMO_ORG_NOT_A_GUEST/.test((await raises(create, [real, "Demo Workspace", payload()])) ?? ""));
    check("refuses a Guest who already has an org",
      /DEMO_ORG_GUEST_HAS_ORG/.test((await raises(create, [guest, "Demo Workspace", payload()])) ?? ""));
    check("refuses the TEKGUYZ Demo name",
      /DEMO_ORG_BAD_NAME/.test((await raises(create, [guest2, "TEKGUYZ Demo", payload()])) ?? ""));

    const before = await one("select count(*) as n from pg_temp.organizations");
    const bad = JSON.stringify({ ...JSON.parse(payload()), tasks: [{ lead_id: guest, title: "names no lead", due_at: new Date().toISOString(), completed: false }] });
    check("all or nothing: a bad row leaves no org behind",
      (await raises(create, [guest2, "Demo Workspace", bad])) !== null &&
        (await one("select count(*) as n from pg_temp.organizations")).n === before.n);

    console.log("\ndelete_expired_demo_orgs");
    const { id: freshOrg } = await one(create, [guest2, "Demo Workspace", payload()]);
    await client.query("update pg_temp.organizations set created_at = now() - interval '8 days' where id = $1", [orgId]);
    const { id: tekguyzDemo } = await one(
      "insert into pg_temp.organizations (name, is_demo, created_at) values ('TEKGUYZ Demo', true, now() - interval '90 days') returning id",
    );
    const { id: realOrg } = await one(
      "insert into pg_temp.organizations (name, created_at) values ('Real Co', now() - interval '90 days') returning id",
    );
    const { id: mixedOrg } = await one(
      "insert into pg_temp.organizations (name, is_demo, created_at) values ('Mixed', true, now() - interval '90 days') returning id",
    );
    await client.query(
      "insert into pg_temp.organization_members (organization_id, user_id, role) values ($1, $2, 'OWNER'), ($3, $2, 'OWNER')",
      [realOrg, real, mixedOrg],
    );

    const returned = (await client.query(
      "select guest_user_id from pg_temp.delete_expired_demo_orgs(now() - interval '7 days')",
    )).rows.map((r) => r.guest_user_id).sort();
    check("returns the old Guest and the orphan Guest, nobody else",
      JSON.stringify(returned) === JSON.stringify([guest, orphan].sort()), returned);

    const left = (await client.query("select id from pg_temp.organizations")).rows.map((r) => r.id);
    check("deletes the old Demo Org", !left.includes(orgId));
    check("keeps the new Demo Org", left.includes(freshOrg));
    check("keeps TEKGUYZ Demo", left.includes(tekguyzDemo));
    check("keeps the real org", left.includes(realOrg));
    check("keeps an old demo org that has a real member", left.includes(mixedOrg));
    const rows = await one("select count(*) as n from pg_temp.leads where organization_id = $1", [orgId]);
    check("the old Demo Org's rows cascade away", rows.n === "0");

    const plan = await one(
      "select pg_catalog.count(*) as n from pg_indexes where schemaname like 'pg_temp%' and indexname = 'organizations_demo_created_at_idx'",
    );
    check("partial index created", plan.n === "1");

    const realFns = await one(
      "select count(*) as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('create_demo_org', 'delete_expired_demo_orgs')",
    );
    console.log(`\nSAFETY: public functions exist? ${realFns.n === "0" ? "no — real schema untouched" : "YES — UNEXPECTED"}`);
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }

  if (failures) throw new Error(`${failures} check(s) failed.`);
  console.log("\nDRY RUN PASSED.");
}

main().catch((e) => {
  console.error("\nDRY RUN FAILED —", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
