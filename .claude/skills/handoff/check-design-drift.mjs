#!/usr/bin/env node
/**
 * DESIGN.md <-> globals.css drift check (handoff skill, Job 1 check 9).
 *
 * Cheap and mechanical on purpose. It compares ONLY the values DESIGN.md
 * states in its three token tables against src/app/globals.css, which
 * CLAUDE.md names as the single source of truth for every token value:
 *
 *   1. Color Tokens (OKLCH)  + Additions beyond the original v2 draft
 *   2. Typography            (size / weight / tracking per role)
 *   3. Border Radius Scale
 *
 * It is drift detection on stated values, not design QA. It does not judge
 * contrast, accessibility, spacing prose, or anything DESIGN.md describes in
 * words rather than in a table row. It never edits either file.
 *
 * Usage:  node .claude/skills/handoff/check-design-drift.mjs
 * Exit 0 = no drift. Exit 1 = drift found (details on stdout). Exit 2 = the
 * check itself could not run (file missing / table shape changed).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DESIGN = join(ROOT, "docs", "DESIGN.md");
const CSS = join(ROOT, "src", "app", "globals.css");

/* ---------- helpers ---------- */

// `oklch(1.00 0.000 0)` and `oklch(1 0 0)` are the same colour. Compare on
// numeric value, not on the literal string, or every trailing zero is a
// false positive.
const norm = (s) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/-?\d*\.?\d+/g, (n) => String(Number(n)));

const cells = (line) =>
  line
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());

function braceBlock(css, headerRe) {
  const m = headerRe.exec(css);
  if (!m) return null;
  const open = css.indexOf("{", m.index);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  return null;
}

function declarations(block) {
  const out = new Map();
  /* Strip comments BEFORE matching, not after. A prose comment that names a
     token ("--cold-fg is the same pairing as --danger-fg: one value cannot
     be both...") otherwise matches as a declaration and, being later in the
     file, overwrites the real one — reported on 2026-08-17 as a --danger-fg
     mismatch whose "value" was a paragraph of English. */
  const clean = block.replace(/\/\*[\s\S]*?\*\//g, " ");
  for (const m of clean.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out.set(m[1], m[2].trim());
  }
  return out;
}

/* ---------- read ---------- */

let design, css;
try {
  design = readFileSync(DESIGN, "utf8");
  css = readFileSync(CSS, "utf8");
} catch (e) {
  console.error(`design-drift: cannot read a source file — ${e.message}`);
  process.exit(2);
}

const lightBlock = braceBlock(css, /^\s*:root,/m);
const darkBlock = braceBlock(css, /^\s*\.dark\s*\{/m);
const themeBlock = braceBlock(css, /^\s*@theme\b/m);

if (!lightBlock || !darkBlock || !themeBlock) {
  console.error(
    "design-drift: globals.css no longer has the expected `:root,` / `.dark` / `@theme` blocks. " +
      "Update this script before trusting the check."
  );
  process.exit(2);
}

const light = declarations(lightBlock);
const dark = declarations(darkBlock);
const theme = declarations(themeBlock);

const findings = [];
const counts = { color: 0, type: 0, radius: 0 };

const compare = (kind, label, stated, actual) => {
  if (actual === undefined) {
    findings.push(`${kind}  ${label}: DESIGN.md states \`${stated}\`, globals.css defines nothing.`);
  } else if (norm(stated) !== norm(actual)) {
    findings.push(`${kind}  ${label}: DESIGN.md states \`${stated}\`, globals.css has \`${actual}\`.`);
  }
};

/* ---------- 1. colour tables ---------- */
// Row shape: | `--token` <any prose> | `oklch(...)` | `oklch(...)` | use |
for (const line of design.split("\n")) {
  if (!line.startsWith("|")) continue;
  const c = cells(line);
  if (c.length < 3) continue;
  const token = c[0].match(/--[a-z0-9-]+/i)?.[0];
  const statedLight = c[1].match(/oklch\([^)]*\)/i)?.[0];
  const statedDark = c[2].match(/oklch\([^)]*\)/i)?.[0];
  if (!token || !statedLight || !statedDark) continue;
  counts.color++;
  compare("colour", `${token} (light)`, statedLight, light.get(token));
  compare("colour", `${token} (dark)`, statedDark, dark.get(token));
}

/* ---------- 2. typography table ---------- */
const ROLES = {
  Display: "display",
  "Heading-1": "h1",
  "Heading-2": "h2",
  Title: "title",
  "Body-md": "body-md",
  "Body-sm": "body-sm",
  Label: "label",
  Caption: "caption",
};
for (const line of design.split("\n")) {
  if (!line.startsWith("|")) continue;
  const c = cells(line);
  if (c.length < 4) continue;
  const slug = ROLES[c[0]];
  if (!slug || !/^\d+px$/.test(c[1])) continue;
  counts.type++;
  compare("type  ", `--text-${slug} size`, c[1], theme.get(`--text-${slug}`));
  compare("type  ", `--text-${slug} weight`, c[2], theme.get(`--text-${slug}--font-weight`));

  // Tracking cell may read "normal", or carry a note ("0.02em, uppercase
  // optional"). "normal" means the role declares no letter-spacing at all.
  const tracking = c[3].split(",")[0].trim();
  const actual = theme.get(`--text-${slug}--letter-spacing`);
  if (/^normal$/i.test(tracking)) {
    if (actual !== undefined)
      findings.push(
        `type    --text-${slug} tracking: DESIGN.md states \`normal\`, globals.css sets \`${actual}\`.`
      );
  } else {
    compare("type  ", `--text-${slug} tracking`, tracking, actual);
  }
}

/* ---------- 3. radius table ---------- */
for (const line of design.split("\n")) {
  if (!line.startsWith("|")) continue;
  const c = cells(line);
  if (c.length < 2) continue;
  const util = c[0].match(/`rounded-([a-z]+)`/)?.[1];
  // rounded-full is Tailwind's own stock value; v2 does not override it, so
  // there is deliberately no --radius-full in globals.css.
  if (!util || util === "full" || !/^\d+px$/.test(c[1])) continue;
  counts.radius++;
  compare("radius", `--radius-${util}`, c[1], theme.get(`--radius-${util}`));
}

/* ---------- report ---------- */

if (counts.color === 0 || counts.type === 0 || counts.radius === 0) {
  console.error(
    `design-drift: parsed ${counts.color} colour / ${counts.type} type / ${counts.radius} radius rows ` +
      "from docs/DESIGN.md — a table shape changed and the check is no longer reading it. " +
      "Fix this script; do not report a pass."
  );
  process.exit(2);
}

const scanned = `${counts.color} colour tokens (x2 themes), ${counts.type} type roles, ${counts.radius} radius steps`;

if (findings.length === 0) {
  console.log(`design-drift: OK — ${scanned} match src/app/globals.css.`);
  process.exit(0);
}

console.log(`design-drift: ${findings.length} MISMATCH(ES) — scanned ${scanned}.`);
for (const f of findings) console.log(`  ${f}`);
process.exit(1);
