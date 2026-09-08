---
name: handoff
description: Run the repo's doc checks and git state, then print a paste-ready handoff block for the user's Claude.ai planning Project. Reads check-script output, never whole documents. Use when the user asks for a handoff, a status sync, "where are we", or says they are about to plan/spec/write a prompt in Claude.ai.
---

# Handoff to the Claude.ai planning Project

The user runs a **separate Claude.ai Project** for planning, specs, PRDs and
prompt-writing. That Project reads this repo's files through the **GitHub
connector**, so it already has `CLAUDE.md`, `docs/KNOWN_GAPS.md`,
`docs/ROADMAP.md` and `docs/ADDENDA_LOG.md` as they are on the branch.

**What sync cannot give it:** commit history, what happened this session, what
was decided, what was rejected, and what needs a human. That is what this block
is for, and it is the only thing this block should carry.

## The reading budget — this is the point of the skill

This skill was split from `doc-audit` on 2026-09-08 because it was reading five
whole documents on every run — about 55k tokens before writing a word — several
times a day.

**Hard rules. Do not reason past these.**

- **Read check-script *output*, never the documents they check.** The scripts
  already name the exact stale entry. That naming is the finding.
- **Never open `docs/SCHEMA_REFERENCE.md`.** It is the largest file in the repo.
  Check 10 in `doc-audit` verifies its inventories; this skill does not.
- **Never open `docs/DESIGN.md` or `docs/ADDENDA_LOG.md`.** `check-design-drift`
  covers the first; the second is history, and history does not change.
- **`CLAUDE.md` is already in context** — it loads every session. Read § 3 from
  what you already have. Do not re-read the file.
- **For open work, grep the *titles*, not the bullets.** Use:

  ```bash
  grep -n -o "^- \*\*[^*]*\*\*" docs/KNOWN_GAPS.md
  ```

  That returns every gap's bolded title with its line number — about 2.4 KB
  against the file's 37 KB. Then `sed -n '<N>p' docs/KNOWN_GAPS.md` for the one
  or two bullets the block actually needs.

  **Do not grep `⬜` instead.** That was measured on 2026-09-08: it returns
  32 KB of the file's 37 KB, because the bullets are long and the marker sits
  inside them. It saves nothing.
- **Never repair a doc here.** If a check reports drift, name it in the block
  and tell the user to run `doc-audit`. Repair is that skill's job.

If a check exits `2`, it **could not run** and is not a pass. Say so in the
block; do not treat silence as clean.

## What to gather

1. `npm run check:docs` — design drift, doc figures, section pointers.
2. `npm run check:residue` — live test residue. Needs `.env`, so **run it
   through the PowerShell tool**, not Bash (the Bash tool is sandboxed and
   cannot see `.env`).
3. `git log --oneline -20` and, if the branch tracks a remote,
   `git log origin/main --oneline -5`.
4. `git status -sb` and `git diff --stat`.
5. `docs/KNOWN_GAPS.md` open bullets, by grep.
6. `CLAUDE.md` § 3, from context.

Gates (`npm run build`, `npm run lint`, `npx tsc --noEmit`, `npm test`) only if
the block will claim something is done. Otherwise report them as not run.

## Print the block

Output it as a fenced markdown block the user can copy whole. **Print it in the
response; do not write it to a file** — it is a message, not an artifact.

Keep it under roughly 400 words. The planning Project already has the synced
docs; this is not the place to re-derive them.

```markdown
## TEKGUYZ CRM — handoff <YYYY-MM-DD>

**Deployed:** <what production is currently running — commit sha + one line, or "unverified — Vercel not checked this session">
**Repo:** <clean / N uncommitted files> · <in sync with remote / N unpushed>
**Gates:** <build/lint/typecheck/test — pass, or not run this session>
**Checks:** <check:docs and check:residue — clean, or N findings, or "check N could not run">

### Shipped since last handoff
- <one line per initiative or batch, with the measured figure that matters>

### This session
- <3-6 bullets: what was asked, what was decided, what was rejected and why>

### Open now
- <what is genuinely open, from CLAUDE.md § 3 and the KNOWN_GAPS.md grep>
- <every check finding, one line each: which token/figure/pointer, and which file is wrong. Omit the line entirely when that check exits 0.>

### Needs the user, not more code
- <anything awaiting visual sign-off, a copy/product decision, or a real device>
- <every residue finding, with the scoped DELETE to run — the user runs it, not you. Omit entirely when that check exits 0.>
- <"Run `doc-audit`" if any check reported drift this run>
```

## Rules for the block

- **Nothing named in `docs/KNOWN_GAPS.md` § "Permanently rejected — never
  re-list" appears anywhere in this block.** Find that section's line range with
  `grep -n "^### " docs/KNOWN_GAPS.md`, and strike every title from the titles
  grep that falls inside it — **before drafting**, not while writing. An
  item that reaches the drafting step reads exactly like a real one. Three
  sources keep surfacing them and all three are working correctly: addenda
  history, live `get_advisors` runs, and neighbouring open bullets. Surfacing is
  expected; **reporting is the bug.**
- **Every claim measured.** If a figure was not verified this run, either verify
  it now or leave it out. Never carry a number forward from memory.
- **Rejections are load-bearing.** The planning Project writes the next brief;
  telling it what was considered and rejected stops it re-proposing that. This
  is the highest-value part of the block.
- **Name the reserved systems** — the multi-tenant security model, the
  Form/Action field-parity rule, "a classifier verdict routes, never hides", the
  Going Cold SLA treatment — if the session touched anything near them, so the
  planning Project doesn't propose around them blind.
- **No hedging and no filler.** "Design System v2 foundation shipped, 49 tests
  passing" or "…is uncommitted" — never "essentially done."
- **No attach-list.** The planning Project gets its files from the GitHub
  connector. If a doc changed in the repo, the user clicks "Sync now" — do not
  print a file list, and never tell the user to re-upload anything.
