#!/usr/bin/env node
// Handoff audit, check 12 — reference integrity of `§ <Section Title>` pointers.
//
// This repo navigates entirely by section pointer. CLAUDE.md, KNOWN_GAPS.md,
// SCHEMA_REFERENCE.md, DESIGN.md, the addenda themselves and the handoff skill
// all cite work as ``docs/ADDENDA_LOG.md § <Section Title>`` (or `§ <Title>`
// against their own file). Nothing renders those into links, so a pointer that
// no longer resolves fails silently: the reader sees an authoritative-looking
// citation and finds nothing behind it.
//
// That stopped being hypothetical on 2026-08-18, when ADDENDA_LOG.md was split
// into docs/addenda/*.md and became an index. 55 pointers were re-verified by
// hand that day. The split was a one-off; the invariant it proved is permanent
// and decays on every new addendum — a section appended to a month file without
// an index row is unreachable by every cross-reference in the repo.
//
// Three checks, all deterministic:
//   A. every `§` pointer resolves to a real heading or index title
//   B. every index row in ADDENDA_LOG.md points at a section that exists
//   C. every `##` section in docs/addenda/*.md has an index row
//
// Repo-only. No browser, no dev server, no database — same fence as checks 9-10.
// Exit 0 clean · 1 drift · 2 could not read something (NOT a pass).
import { readFileSync, readdirSync } from "node:fs";

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

// Citations are copied by hand across six files, so they drift in punctuation
// long before they drift in meaning. Normalise everything that carries no
// navigational information: markdown emphasis, code ticks, quote style, and the
// three dash characters this repo mixes freely in titles.
function norm(s) {
  return s
    // Drop a possessive before the apostrophe itself goes, so "§ 3's Brand
    // Identity entry" yields the candidate "3" rather than "3s".
    .replace(/['’]s\b/g, "")
    .replace(/[`*_"'“”‘’]/g, "")
    .replace(/[—–-]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const ADDENDA_DIR = "docs/addenda";
const INDEX = "docs/ADDENDA_LOG.md";
const SOURCES = [
  "CLAUDE.md",
  "docs/KNOWN_GAPS.md",
  "docs/SCHEMA_REFERENCE.md",
  "docs/DESIGN.md",
  INDEX,
  ".claude/skills/handoff/SKILL.md",
];

let addendaFiles = [];
try {
  addendaFiles = readdirSync(ADDENDA_DIR).filter((f) => f.endsWith(".md")).sort();
} catch (e) {
  hardFail = true;
  findings.push(`CANNOT READ ${ADDENDA_DIR} — ${e.message}`);
}

// ---------------------------------------------------------------------------
// Build the target set: every heading in every doc, plus the index table's
// title column. A pointer may legitimately aim at any of them — `§ 3` and
// `§ Test-Data Cleanup` aim inside CLAUDE.md, `§ Prompt 13a addendum` aims
// through the index at a month file.
// ---------------------------------------------------------------------------
const targets = new Map(); // normalised heading -> where it lives

function collectHeadings(path, text) {
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^#{2,4}\s+(.*\S)\s*$/);
    if (m) targets.set(norm(m[1]), path);
    // docs/SCHEMA_REFERENCE.md anchors its addenda on a bold paragraph lead
    // rather than a `##` heading, and other docs cite those leads with `§`
    // exactly as they cite real headings — "§ Invite-close trigger addendum"
    // resolves to a `**…**` run, not to a heading.
    const b = line.match(/^\*\*([^*]{4,}?)[(:*]/);
    if (b) targets.set(norm(b[1]), path);
  }
}

const fileText = new Map();
for (const path of [...SOURCES, ...addendaFiles.map((f) => `${ADDENDA_DIR}/${f}`)]) {
  const text = read(path);
  if (text === null) continue;
  fileText.set(path, text);
  collectHeadings(path, text);
}

// Index rows: | <title> | [`docs/addenda/x.md`](addenda/x.md) |
const indexRows = new Map(); // normalised title -> { title, file }
const indexText = fileText.get(INDEX);
if (indexText) {
  for (const line of indexText.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    // Exactly two columns. ADDENDA_LOG.md carries a second, three-column table
    // ("Where the entries live": Part | File | Sections) whose rows describe
    // files rather than sections — accepting those invented four phantom
    // "index row broken" findings on the first run.
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length !== 4) continue;
    const title = cells[1];
    const target = cells[2];
    const fm = target.match(/docs\/addenda\/([a-z0-9-]+\.md)/i);
    if (!fm || !title || /^-+$/.test(title) || /^§/.test(title)) continue;
    indexRows.set(norm(title), { title, file: `${ADDENDA_DIR}/${fm[1]}` });
    targets.set(norm(title), INDEX);
  }
  if (indexRows.size === 0) {
    hardFail = true;
    findings.push(
      `CANNOT PARSE ${INDEX} — no section-index rows found. If the index table was ` +
        "reshaped, update this script; do not treat this as a pass.",
    );
  }
}

// ---------------------------------------------------------------------------
// A. Every `§` pointer resolves.
//
// Prose wraps, so a pointer can straddle a newline (docs/DESIGN.md does exactly
// this). Collapse whitespace across the whole file before extracting, which
// costs the line number and buys never missing a wrapped citation.
//
// Where a citation ENDS cannot be found by punctuation: titles here contain
// commas ("Webhook Rotation, Clear-Key, and Locale Options"), colons and
// parentheses, so any terminator strict enough to stop at a sentence end also
// truncates a legitimate title mid-way. So capture generously and resolve by
// deterministic longest match instead — walk word-prefixes of the captured text
// from longest to shortest and take the first that lands. A citation is
// routinely shorter than its title ("Account Panel: Password" for a title that
// runs on) and just as routinely longer ("Known Gaps - Full Historical Record
// (2026-07-22 triage)"), so a prefix in either direction counts.
//
// Two-word-or-longer prefixes may also match mid-title, because CLAUDE.md § 3
// cites a series as "… — Prompts 1 & 2, § Prompt 3, § Prompt 4": the
// continuations are real pointers that carry no title head of their own. One
// word is never enough for that — it would match almost anything.
// ---------------------------------------------------------------------------
function resolves(cited) {
  const words = norm(cited).split(" ").filter(Boolean);
  for (let n = words.length; n >= 1; n--) {
    // A prefix cut mid-sentence keeps the punctuation that followed it —
    // "§ 3, and why…" yields the candidate "3," which matches no heading.
    const c = words.slice(0, n).join(" ").replace(/[,.:;]+$/, "");
    for (const t of targets.keys()) {
      if (c === t || c.startsWith(t) || t.startsWith(c)) return true;
      if (n >= 2 && t.includes(c)) return true;
    }
  }
  return false;
}

let pointerCount = 0;
for (const [path, text] of fileText) {
  const flat = text.replace(/\s+/g, " ");
  // Stop at the punctuation that ends a citation in this repo's prose, at a
  // `→` sub-heading pointer, and at a table cell wall.
  const re = /§\s*([^|;\n]*?)(?=\s*(?:,\s*§|[|;)]|\.\s|\.$|→|$))/g;
  let hit;
  while ((hit = re.exec(flat)) !== null) {
    // A backticked `§` is the docs talking ABOUT the symbol, not citing with it.
    if (flat[hit.index - 1] === "`") continue;
    // Trim trailing connectives left behind by "§ Prompt 15a and § Prompt 15b".
    const cited = hit[1].replace(/\s+(and|or|plus)$/i, "").trim();
    // `§ <Section Title>` is the placeholder every one of these files uses to
    // describe the citation convention itself, and "§ Section title" is the
    // index table's own column header. Neither is a live pointer.
    if (!cited || cited.startsWith("<") || norm(cited) === "section title") continue;
    // Every section title in this repo opens with a capital, a digit, a dash or
    // a code tick. A lowercase opener means the `§` is being used as prose
    // shorthand for "that section" rather than as a citation.
    if (/^[a-z]/.test(cited)) continue;
    pointerCount++;
    if (!resolves(cited)) {
      findings.push(`DANGLING POINTER: ${path} cites "§ ${cited}" — no matching section or index title.`);
    }
  }
}
if (pointerCount === 0) {
  hardFail = true;
  findings.push("CANNOT PARSE — zero § pointers found across the doc set, which cannot be right.");
} else if (!findings.length) {
  notes.push(`${pointerCount} § pointers all resolve`);
}

// ---------------------------------------------------------------------------
// B. Every index row points at a section that actually exists in that file.
// ---------------------------------------------------------------------------
let brokenRows = 0;
for (const [, entry] of indexRows) {
  const text = fileText.get(entry.file);
  if (text === undefined) {
    brokenRows++;
    findings.push(`INDEX ROW BROKEN: "${entry.title}" names ${entry.file}, which does not exist.`);
    continue;
  }
  const headings = text
    .split(/\r?\n/)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => norm(l.replace(/^##\s+/, "")));
  if (!headings.includes(norm(entry.title))) {
    brokenRows++;
    findings.push(
      `INDEX ROW BROKEN: "${entry.title}" is indexed to ${entry.file} but no such ## section is there.`,
    );
  }
}
if (indexRows.size && !brokenRows) notes.push(`${indexRows.size} index rows all resolve to real sections`);

// ---------------------------------------------------------------------------
// C. Every section in docs/addenda/*.md has an index row.
//
// This is the direction that decays with normal use: append an addendum to a
// month file, forget the index row, and the section is unreachable by every
// pointer in the repo while every earlier check stays green.
// ---------------------------------------------------------------------------
let orphans = 0;
let sectionCount = 0;
for (const f of addendaFiles) {
  const path = `${ADDENDA_DIR}/${f}`;
  const text = fileText.get(path);
  if (text === undefined) continue;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.*\S)\s*$/);
    if (!m) continue;
    sectionCount++;
    if (!indexRows.has(norm(m[1]))) {
      orphans++;
      findings.push(`UNINDEXED SECTION: ${path} contains "## ${m[1]}" with no row in ${INDEX}.`);
    }
  }
}
if (sectionCount && !orphans) notes.push(`${sectionCount} addenda sections all indexed`);

// ---------------------------------------------------------------------------
if (hardFail) {
  console.error("section-pointers: COULD NOT COMPLETE — this is not a pass.");
  for (const f of findings) console.error("  " + f);
  process.exit(2);
}
if (findings.length) {
  console.error(`section-pointers: ${findings.length} reference-integrity finding(s).`);
  for (const f of findings) console.error("  " + f);
  process.exit(1);
}
console.log("section-pointers: OK — " + notes.join("; ") + ".");
process.exit(0);
