#!/usr/bin/env node
// Handoff audit, check 10 — assertion drift.
//
// Checks 1-8 are CHANGE-driven: they start from a commit, a session's work, or
// a doc entry and ask "is anything downstream stale?" That leaves a hole. A doc
// can assert a figure that was measured correctly once and quietly rotted, with
// no commit, no session touch and no doc-vs-doc contradiction to trip on.
//
// That hole is not hypothetical. `docs/KNOWN_GAPS.md` carried "92 tests, 15
// suites" for two sessions after 94de14b made it 100/17 — through a full
// handoff audit that ran `vitest` and saw 100/17 on screen without ever
// comparing the two numbers. It was caught by an outside reader, not by us.
//
// Check 9 (check-design-drift.mjs) already proves the fix: a scripted,
// deterministic comparison that runs every time and cannot be reasoned past
// under context pressure. This is the same idea for countable claims.
//
// Repo-only. No browser, no dev server, no database — same fence as check 9.
// Exit 0 clean · 1 drift · 2 could not read something (NOT a pass).
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const findings = [];
const notes = [];
let hardFail = false;

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    hardFail = true;
    findings.push(`CANNOT READ ${path} — ${e.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// A. Test counts: docs/KNOWN_GAPS.md vs a real vitest run.
//
// The bold "**N tests, M suites**" mark is the current claim; the "Earlier
// marks:" chain after it is history and is deliberately not checked.
// ---------------------------------------------------------------------------
const gaps = read("docs/KNOWN_GAPS.md");
if (gaps !== null) {
  const m = gaps.match(/\*\*(\d+)\s+tests?,\s*(\d+)\s+suites?\*\*/);
  if (!m) {
    hardFail = true;
    findings.push(
      'CANNOT PARSE docs/KNOWN_GAPS.md — no "**N tests, M suites**" mark found. ' +
        "If that bullet was intentionally reworded, update this script; do not treat this as a pass.",
    );
  } else {
    const [, claimedTests, claimedSuites] = [m[0], Number(m[1]), Number(m[2])];
    let json;
    try {
      // --silent keeps vitest's own output off stdout so the JSON parses.
      // shell:true is required on Windows — npx is a .cmd shim and execFileSync
      // rejects it with EINVAL otherwise.
      const out = execFileSync("npx", ["vitest", "run", "--reporter=json", "--silent"], {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
        shell: true,
      });
      json = JSON.parse(out.slice(out.indexOf("{")));
    } catch (e) {
      hardFail = true;
      findings.push(`CANNOT RUN vitest for the test-count check — ${e.message.split("\n")[0]}`);
    }
    if (json) {
      const realSuites = json.testResults.length;
      const realTests = json.testResults.reduce((n, t) => n + t.assertionResults.length, 0);
      if (realTests !== claimedTests || realSuites !== claimedSuites) {
        findings.push(
          `TEST COUNT: docs/KNOWN_GAPS.md claims ${claimedTests} tests / ${claimedSuites} suites; ` +
            `a real vitest run reports ${realTests} tests / ${realSuites} suites.`,
        );
      } else {
        notes.push(`test count ${realTests}/${realSuites} matches KNOWN_GAPS.md`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// B. SECURITY DEFINER inventory: migrations vs the table in SCHEMA_REFERENCE.md.
//
// That table calls itself a "running inventory", so a function missing from it
// is a real gap. Caught vault_get_org_credential, live and documented in
// CLAUDE.md but absent from the table.
//
// Source of truth here is the migration files, not the live database, so this
// stays inside check 9's no-network fence. A function created outside a
// migration would be invisible to this check and is a separate problem.
// ---------------------------------------------------------------------------
const MIGRATIONS = "supabase/migrations";
let migFiles = [];
try {
  migFiles = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
} catch (e) {
  hardFail = true;
  findings.push(`CANNOT READ ${MIGRATIONS} — ${e.message}`);
}

const secdef = new Set();
for (const f of migFiles) {
  const sql = read(`${MIGRATIONS}/${f}`);
  if (sql === null) continue;
  // Match each function definition head up to its body delimiter, then keep the
  // ones whose head declares SECURITY DEFINER. Comments in this repo mention the
  // phrase constantly, so anchoring on the definition head is what avoids noise.
  const re =
    /create\s+(?:or\s+replace\s+)?function\s+([a-z_]+\.[a-z_]+)\s*\([\s\S]*?\bas\s+\$\$/gi;
  let hit;
  while ((hit = re.exec(sql)) !== null) {
    const head = hit[0].replace(/--[^\n]*/g, "");
    if (/\bsecurity\s+definer\b/i.test(head)) secdef.add(hit[1].toLowerCase());
  }
}

const schema = read("docs/SCHEMA_REFERENCE.md");
if (schema !== null && secdef.size > 0) {
  // Rows list the function either bare (`import_leads_chunk`) or schema-qualified
  // (`private.current_org_ids()`), so match the bare name anywhere in a table
  // row rather than immediately after the pipe — anchoring tighter than this
  // produced a false positive on current_org_ids, which is in fact listed.
  const tableRows = schema.split(/\r?\n/).filter((l) => l.startsWith("|"));
  const missing = [...secdef].filter((fn) => {
    const bare = fn.split(".")[1];
    return !tableRows.some((row) => new RegExp("\\b" + bare + "\\b", "i").test(row));
  });
  if (missing.length) {
    findings.push(
      `SECURITY DEFINER INVENTORY: ${missing.length} function(s) defined in ${MIGRATIONS} ` +
        `are absent from the inventory table in docs/SCHEMA_REFERENCE.md — ${missing.join(", ")}.`,
    );
  } else {
    notes.push(`${secdef.size} SECURITY DEFINER functions all present in SCHEMA_REFERENCE.md`);
  }
}

// ---------------------------------------------------------------------------
// C. Latest migration is named somewhere in docs/SCHEMA_REFERENCE.md.
//
// CLAUDE.md requires that file to be edited alongside a migration, so a newest
// migration nothing references is the cheapest possible signal that it wasn't.
// ---------------------------------------------------------------------------
if (schema !== null && migFiles.length) {
  const newest = migFiles[migFiles.length - 1];
  if (!schema.includes(newest)) {
    findings.push(
      `MIGRATION NOT DOCUMENTED: ${newest} is the newest migration but is not named in docs/SCHEMA_REFERENCE.md.`,
    );
  } else {
    notes.push(`newest migration ${newest} is referenced in SCHEMA_REFERENCE.md`);
  }
}

// ---------------------------------------------------------------------------
if (hardFail) {
  console.error("doc-figures: COULD NOT COMPLETE — this is not a pass.");
  for (const f of findings) console.error("  " + f);
  process.exit(2);
}
if (findings.length) {
  console.error(`doc-figures: ${findings.length} drift finding(s).`);
  for (const f of findings) console.error("  " + f);
  process.exit(1);
}
console.log("doc-figures: OK — " + notes.join("; ") + ".");
process.exit(0);
