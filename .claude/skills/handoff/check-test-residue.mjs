#!/usr/bin/env node
// Handoff audit, check 13 — live test residue.
//
// CLAUDE.md § Test-Data Cleanup is a permanent rule: anything created to verify
// something is part of that unit of work, and a unit is not finished while its
// residue is still in the database. The rule has been in the file for weeks and
// has been broken twice anyway — sixteen test leads accumulated in the real
// TEKGUYZ org across three weeks, and on 2026-08-18 the doc audit found two
// MEMBER membership rows and two ACCEPTED invites still sitting in TEKGUYZ Demo
// from 2026-07-25's invite/role testing.
//
// Neither was a knowledge failure. The rule was written, correct, and read. The
// failure was that nothing ever looked. So this is a script rather than another
// paragraph — checks 9 and 10 already prove that shape works.
//
// SELECT ONLY. This script never writes, and deliberately cannot: CLAUDE.md
// requires removal to be a human-run DELETE (or a disposable service-role
// script), never an agent write against a `public` table. Findings therefore
// print the scoped DELETE for a human to run, and stop there.
//
// Unlike checks 9-12 this one DOES touch the network — it is the only check in
// the audit that does. It needs .env, so run it via `npm run check:residue`.
// Exit 0 clean · 1 residue found · 2 could not check (NOT a pass).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const findings = [];
const notes = [];

function bail(message) {
  console.error("test-residue: COULD NOT COMPLETE — this is not a pass.");
  console.error("  " + message);
  process.exit(2);
}

// The demo org's name and its seeded owner are defined once, in the seed
// library. Read them from there rather than restating them — that constant is
// already duplicated by hand into src/app/api/dev-login/route.ts, and a third
// copy is a third thing to drift.
const SEED_LIB = "scripts/seed/lib/demo-org.ts";
let DEMO_ORG_NAME, DEMO_OWNER_EMAIL;
try {
  const src = readFileSync(SEED_LIB, "utf8");
  DEMO_ORG_NAME = src.match(/DEMO_ORG_NAME\s*=\s*"([^"]+)"/)?.[1];
  DEMO_OWNER_EMAIL = src.match(/DEMO_OWNER_EMAIL\s*=\s*"([^"]+)"/)?.[1];
} catch (e) {
  bail(`CANNOT READ ${SEED_LIB} — ${e.message}`);
}
if (!DEMO_ORG_NAME || !DEMO_OWNER_EMAIL) {
  bail(`CANNOT PARSE ${SEED_LIB} — DEMO_ORG_NAME / DEMO_OWNER_EMAIL not found. Update this script.`);
}

// The demo org gained a SECOND permanent member on 2026-09-04: the public
// read-only demo visitor behind /demo (scripts/seed/lib/demo-visitor.ts). It is
// seeded, not residue, and its email comes from the environment rather than
// from source — so it is read from there, and there is no third hardcoded copy.
//
// This matters beyond a false positive. Until this was added, the removal SQL
// this script prints deleted every membership except the owner's, which would
// have taken the demo visitor with it and broken the public demo the next time
// a human pasted it.
const DEMO_VISITOR_EMAIL = process.env.DEMO_VISITOR_EMAIL?.trim() || null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  bail(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY. " +
      "Run this via `npm run check:residue`, which loads .env for you.",
  );
}
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function sel(table, columns, build) {
  let q = db.from(table).select(columns);
  if (build) q = build(q);
  const { data, error } = await q;
  if (error) bail(`SELECT on ${table} failed — ${error.message}`);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// A. The demo org should contain exactly what the seed creates.
//
// The seed creates exactly TWO memberships and no invites: the demo OWNER
// (scripts/seed/lib/demo-org.ts) and, since 2026-09-04, the public read-only
// demo visitor behind /demo (scripts/seed/lib/demo-visitor.ts). Anything else —
// a third membership, an unexpected role, any invite row — is residue by
// construction, and `npm run seed:demo` will never clear it. This is the exact
// shape of the 2026-08-18 finding.
//
// Note the seed now actively redacts non-@example.com members and invites from
// the demo org on every run (demo-membership-hygiene.ts), because /demo is
// public and the app shell renders member emails on every page.
// ---------------------------------------------------------------------------
const orgs = await sel("organizations", "id, name");
const demo = orgs.find((o) => o.name === DEMO_ORG_NAME);

if (!demo) {
  notes.push(`no "${DEMO_ORG_NAME}" org exists — nothing to check there`);
} else {
  const members = await sel("organization_members", "id, user_id, role, created_at", (q) =>
    q.eq("organization_id", demo.id),
  );

  const unexpected = [];
  for (const m of members) {
    const { data, error } = await db.auth.admin.getUserById(m.user_id);
    if (error) bail(`Could not resolve auth user ${m.user_id} — ${error.message}`);
    const email = data?.user?.email ?? "(unknown)";
    const isSeededOwner = email === DEMO_OWNER_EMAIL && m.role === "OWNER";
    const isSeededVisitor =
      DEMO_VISITOR_EMAIL && email === DEMO_VISITOR_EMAIL && m.role === "MEMBER";
    if (!isSeededOwner && !isSeededVisitor) {
      unexpected.push(`${email} (${m.role}, created ${m.created_at})`);
    }
  }
  if (unexpected.length) {
    findings.push(
      `DEMO ORG MEMBERSHIPS: ${unexpected.length} membership row(s) in "${DEMO_ORG_NAME}" that the seed ` +
        `does not create — ${unexpected.join("; ")}. The seed creates ${DEMO_OWNER_EMAIL} as OWNER` +
        (DEMO_VISITOR_EMAIL ? ` and ${DEMO_VISITOR_EMAIL} as MEMBER.` : `.`),
    );
    // The keep-list names what must survive, never what to drop. A WHERE clause
    // that enumerates what to keep survives a mistake; one that enumerates what
    // to drop does not. Deleting the demo visitor's row here would break the
    // public /demo entry point with no error anywhere.
    const keep = [DEMO_OWNER_EMAIL, DEMO_VISITOR_EMAIL]
      .filter(Boolean)
      .map((e) => `'${e}'`)
      .join(", ");
    findings.push(
      `  Removal (run by hand, per CLAUDE.md § Test-Data Cleanup):\n` +
        `    SELECT * FROM organization_members WHERE organization_id = '${demo.id}';\n` +
        `    DELETE FROM organization_members WHERE organization_id = '${demo.id}'\n` +
        `      AND user_id NOT IN (SELECT id FROM auth.users WHERE email IN (${keep}));`,
    );
  } else {
    notes.push(
      `"${DEMO_ORG_NAME}" memberships clean (${members.length} row(s), seeded owner` +
        (DEMO_VISITOR_EMAIL ? ` and demo visitor` : ``) +
        ` only)`,
    );
  }

  const invites = await sel("organization_invites", "id, email, status, created_at", (q) =>
    q.eq("organization_id", demo.id),
  );
  if (invites.length) {
    findings.push(
      `DEMO ORG INVITES: ${invites.length} invite row(s) in "${DEMO_ORG_NAME}" — ` +
        invites.map((i) => `${i.email} (${i.status}, ${i.created_at})`).join("; ") +
        ". The seed creates no invites, so every one of these is test residue.",
    );
    findings.push(
      `  Removal (run by hand):\n` +
        `    SELECT * FROM organization_invites WHERE organization_id = '${demo.id}';\n` +
        `    DELETE FROM organization_invites WHERE organization_id = '${demo.id}';`,
    );
  } else {
    notes.push(`"${DEMO_ORG_NAME}" has no invite rows`);
  }
}

// ---------------------------------------------------------------------------
// B. Synthetic-looking leads in ANY org, the real tenant included.
//
// This is the sixteen-lead shape. A lead written to prove a webhook or a form
// works carries a throwaway address; a real enquiry does not. The demo seed's
// own leads use realistic company domains, so they are not caught here.
//
// `archived` is deliberately NOT a filter. CLAUDE.md is explicit that archiving
// is not removal — an archived row still counts, still shows in Contacts, and
// is exactly how the last batch hid in plain sight.
// ---------------------------------------------------------------------------
const SYNTHETIC = ["example.com", "example.org", "example.net", "test.com", "mailinator.com"];
const orgName = new Map(orgs.map((o) => [o.id, o.name]));
const suspects = await sel("leads", "id, email, client_name, organization_id, archived, created_at", (q) =>
  q.or(SYNTHETIC.map((d) => `email.ilike.%@${d}`).join(",")),
);

if (suspects.length) {
  const byOrg = new Map();
  for (const l of suspects) {
    const k = orgName.get(l.organization_id) ?? l.organization_id;
    byOrg.set(k, [...(byOrg.get(k) ?? []), l]);
  }
  for (const [name, rows] of byOrg) {
    findings.push(
      `SYNTHETIC LEADS in "${name}": ${rows.length} lead(s) on a throwaway domain — ` +
        rows.map((r) => `${r.email}${r.archived ? " [archived]" : ""}`).join("; ") +
        ". Archived counts as present, not removed.",
    );
    const ids = rows.map((r) => `'${r.id}'`).join(", ");
    findings.push(
      `  Removal (run by hand; activity_logs and tasks cascade from leads):\n` +
        `    SELECT id, email, client_name FROM leads WHERE id IN (${ids});\n` +
        `    DELETE FROM leads WHERE id IN (${ids});`,
    );
  }
} else {
  notes.push("no leads on throwaway domains in any org");
}

// ---------------------------------------------------------------------------
if (findings.length) {
  console.error(`test-residue: residue found.`);
  for (const f of findings) console.error("  " + f);
  process.exit(1);
}
console.log("test-residue: OK — " + notes.join("; ") + ".");
process.exit(0);
