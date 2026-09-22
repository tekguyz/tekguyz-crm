---
name: status-sync
description: Audit this repo's status documents — docs/INITIATIVES.md, docs/KNOWN_GAPS.md — and its git state against the real repo, cheaply, from check-script output rather than whole documents. Use when the user asks for a status sync, "where are we", or is about to plan or write against this repo.
---

# Status sync for TEKGUYZ CRM

This repo's status is split by responsibility: current initiative status in
`docs/INITIATIVES.md`, dated narrative in `docs/ADDENDA_LOG.md`, open work in
`docs/KNOWN_GAPS.md`. When any of them is stale, anything planned against them
works from work that already closed — or worse, treats a rejected item as open.

This skill audits that state against the repo's real state and reports it.
**That is the whole job.** It prints no paste block and produces no message for
another tool. Nothing is pasted into a Claude.ai Project any more — see
`C:/Projects/tekguyz-one/docs/adr/0001-retire-the-claude-ai-project-loop.md`.

**There is deliberately no `STATUS.md` here and this skill must never create
one.** `CLAUDE.md` § Reference Index carries the reason; cite it, do not restate
it.

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
- **`CLAUDE.md` is already in context** — it loads every session. Do not re-read
  it. `docs/INITIATIVES.md` does **not** load with it: read that file for the
  initiative status table.
- **For open work, grep the *titles*, not the bullets.** Use:

  ```bash
  grep -n -o "^- \*\*[^*]*\*\*" docs/KNOWN_GAPS.md
  ```

  That returns every gap's bolded title with its line number — about 2.4 KB
  against the file's 43 KB. Then `sed -n '<N>p' docs/KNOWN_GAPS.md` for the one
  or two bullets the audit actually needs.

  **Do not grep `⬜` instead.** That was measured on 2026-09-08: it returns
  almost the whole file, because the bullets are long and the marker sits
  inside them. It saves nothing.
- **Never repair a doc here.** If a check reports drift, name it in the findings
  and tell the user to run `doc-audit`. Repair is that skill's job.

If a check exits `2`, it **could not run** and is not a pass. Say so; do not
treat silence as clean.

## What to gather

1. `npm run check:docs` — design drift, doc figures, section pointers.
2. `npm run check:residue` — live test residue. Needs `.env`, so **run it
   through the PowerShell tool**, not Bash (the Bash tool is sandboxed and
   cannot see `.env` — `CLAUDE.md` § Session & Verification Discipline).
3. **`git fetch origin` FIRST, before any other git command.** Then
   `git log --oneline -20` and, if the branch tracks a remote,
   `git log origin/main --oneline -5`.

   The fetch is not optional. `origin/main` is a **cached local ref**: without
   a fetch it holds whatever the last fetch on THIS machine saw. The user works
   from two laptops against one repo, so on the laptop that did not do the work
   `git status -sb` reports "in sync with origin/main" while the remote is many
   commits ahead — a confident, wrong, measured-looking claim, which is the
   worst kind this audit can carry.
4. `git status -sb` and `git diff --stat`, **after the fetch**. Report three
   states separately and never merge them: **uncommitted in the working tree**
   (not shipped), **ahead of origin** (committed here, not pushed), and
   **behind origin** — say "behind origin/main by N commits — run `git pull`
   before working here", and do not describe the tree as current.
5. `docs/KNOWN_GAPS.md` open bullets, by grep.
6. `docs/INITIATIVES.md`, the initiative status table.

Gates (`npm run build`, `npm run lint`, `npx tsc --noEmit`, `npm test`) only if
the audit will claim something is done. Otherwise report them as not run.

## The exclusion pass — every run

**Nothing named in `docs/KNOWN_GAPS.md` § "Permanently rejected — never
re-list" appears anywhere in this audit's findings.** Find that section's line
range with `grep -n "^### " docs/KNOWN_GAPS.md`, and strike every title from the
titles grep that falls inside it — **before drafting**, not while writing. An
item that reaches the drafting step reads exactly like a real one.

A rejected item is not deferred work and is not partially resolved. It was
considered and closed permanently. Three sources keep surfacing them and all
three are working correctly: addenda history, live `get_advisors` runs, and
neighbouring open bullets. Surfacing is expected; **reporting is the bug.**

No item named there may be raised as a finding, listed as open work, or routed
to the user, no matter which check surfaced it.

## The repair

**This skill does not repair documents.** Naming the drift is the finding; the
repair pass is `doc-audit`, which owns the writes and the commit.

The one exception is this repo's own maintenance policy, which
`docs/KNOWN_GAPS.md` § "How to maintain this file" holds the single copy of and
which differs from the sibling repos': **a resolved item is relocated to
`docs/ADDENDA_LOG.md` § "Known Gaps — Resolved Items Archive" in the same
session, never simply deleted.** If this audit closes a gap itself, follow that
policy and **commit `docs/KNOWN_GAPS.md` and `docs/ADDENDA_LOG.md` alone**,
nothing else in the tree, even if other work is uncommitted. Message: what was
corrected and why. This is a doc-audit commit.

If the status documents were already accurate, say so plainly and change
nothing.

## Reporting back

A short answer in the response. No file, no fenced block, no template.

- Say what the audit found, and never more than that. When it found nothing,
  say `none`.
- Every claim measured. If a figure was not verified this run, verify it now or
  leave it out. Never carry a number forward from memory.
- **Report the three git states separately** — uncommitted, ahead, behind.
- **No hedging.** "Merged and committed" or "uncommitted in the tree" — never
  "essentially complete".
- **Rejections are load-bearing.** Saying what was considered and rejected stops
  the next session re-proposing it.
- **Name the reserved systems** — the multi-tenant security model, the
  Form/Action field-parity rule, "a classifier verdict routes, never hides", the
  Going Cold SLA treatment — if the session touched anything near them.
- Name anything that needs the user: a visual sign-off, a copy or product
  decision, a real device, or a residue `DELETE` — the user runs that, not you.
- Say "run `doc-audit`" if any check reported drift this run.
