// Dry-runs a migration's table DDL against a session-local temp replica of the
// real table, so an agent's migration is verified before a human applies it.
// CLAUDE.md § Session & Verification Discipline makes this a standing rule:
// tsc/eslint/next build cannot see SQL at all, so without this a migration is
// unverified until it fails in the human's hands.
//
// Everything here is session-local: `create temp table` lives in pg_temp and
// disappears when the connection closes. No public-schema object is created,
// altered or written.
//
// Usage: npx tsx --env-file=.env scripts/dryrun-migration.ts
//
// LIMITATION, stated rather than hidden: `create role` and `grant` are
// cluster-level, not session-local, so they cannot be replicated this way.
// Only the table DDL below is genuinely dry-run. The role/grant half is
// verified by the human's apply step.
import { Client } from "pg";

// The table DDL from supabase/migrations/20260904120000_demo_readonly_role.sql,
// run against a replica of the real organizations table rather than the table
// itself. `including all` copies defaults, constraints and not-null flags, so
// a column that would collide or violate a constraint fails here first.
const STATEMENTS: Array<[string, string]> = [
  ["build replica", "create temp table organizations_replica (like public.organizations including all)"],
  ["copy live rows", "insert into organizations_replica select * from public.organizations"],
  ["THE MIGRATION DDL", "alter table organizations_replica add column is_demo boolean not null default false"],
  ["insert after DDL", "insert into organizations_replica (name) values ('dry-run probe')"],
];

const VERIFY = `
  select count(*) as rows_total,
         count(*) filter (where is_demo = false) as defaulted_false,
         count(*) filter (where is_demo is null) as nulls
  from organizations_replica
`;

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL is not set in .env — this is a local-only tool var, never a Vercel one.");
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    for (const [label, sql] of STATEMENTS) {
      const result = await client.query(sql);
      console.log(`  OK  ${label.padEnd(20)} ${result.rowCount ?? 0} row(s)`);
    }

    const { rows } = await client.query(VERIFY);
    console.log("\nVERIFY:", rows[0]);

    if (Number(rows[0].nulls) !== 0) {
      throw new Error("is_demo produced NULLs — the NOT NULL DEFAULT did not hold.");
    }
    if (Number(rows[0].defaulted_false) !== Number(rows[0].rows_total)) {
      throw new Error("not every row defaulted to false.");
    }

    // Prove the real table is untouched — the whole point of a replica.
    const { rows: real } = await client.query(
      "select count(*) as n from information_schema.columns where table_schema='public' and table_name='organizations' and column_name='is_demo'",
    );
    console.log(
      `\nSAFETY: public.organizations.is_demo exists? ${Number(real[0].n) === 0 ? "no — real table untouched" : "YES — UNEXPECTED"}`,
    );

    console.log("\nDRY RUN PASSED.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("\nDRY RUN FAILED —", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
