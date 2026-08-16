---
name: handoff
description: Audit CLAUDE.md § 3, docs/ADDENDA_LOG.md and docs/KNOWN_GAPS.md against the real repo state, repair whichever is stale, then print a paste-ready handoff block for the user's Claude.ai planning Project. Use when the user asks for a handoff, a status sync, "where are we", or says they are about to plan/spec/write a prompt in Claude.ai.
---

# Handoff to the Claude.ai planning Project

The user runs a **separate Claude.ai Project** for planning, specs, PRDs and
prompt-writing — unrelated to this skill and to Claude Code. That Project
cannot see this repo. It knows only what the user pastes into it.

Unlike some sibling repos, tekguyz-crm has **no single `STATUS.md`.** That job
is deliberately split three ways, per this repo's own documented discipline
(CLAUDE.md's Reference Index and its "Build discipline" / Known-Gaps rules):

| What STATUS.md would hold elsewhere | Lives here in |
|---|---|
| Current initiative status, what shipped | `CLAUDE.md` § 3 "Post-Launch Feature Work" |
| Dated build narrative, the "why" behind decisions | `docs/ADDENDA_LOG.md` |
| Deliberately deferred / open work | `docs/KNOWN_GAPS.md` |
| Live DB schema, RLS, RPCs | `docs/SCHEMA_REFERENCE.md` (rarely stale — it's edited alongside migrations, not after the fact) |

Do not create a `docs/STATUS.md` to consolidate these. This repo hit 150KB and
two emergency compressions specifically from letting status content accumulate
in one place instead of staying split by responsibility — see CLAUDE.md's own
compression history in `docs/ADDENDA_LOG.md`. Synthesizing a handoff from three
sources is the cost of avoiding that regression; it is not a shortcut to fix.

Two jobs, in this order. **Never skip job 1.** A handoff generated from a stale
doc looks just as authoritative as an accurate one, and the planning Project
has no way to tell the difference.

---

## Job 1 — audit and repair the three docs

**Measure, never infer.** Every one of this repo's own status claims already
carries this rule — `CLAUDE.md`'s Session & Verification Discipline says a past
conversation or a claim in chat is not evidence that code exists, read the
file. Apply that here just as strictly.

Check, in this order:

1. **What shipped that nothing mentions yet.**
   `git log --oneline -20` and, if the branch tracks a remote, `git log
   origin/main --oneline -5`. For every commit since `docs/ADDENDA_LOG.md`'s
   most recent dated entry, confirm there is either an addendum describing it
   or a CLAUDE.md § 3 status line covering it. Read commit bodies — this repo
   writes real ones.

2. **What CLAUDE.md § 3 claims that verification would contradict.** Each
   initiative there is marked complete or in-progress with a one-line
   disposition. Spot-check the ones that matter for the upcoming planning
   session against the actual code — don't re-verify the whole section on
   every handoff, that defeats the point of the file being short.

3. **What `docs/KNOWN_GAPS.md` claims that is no longer true.** Grep its Open
   items for anything the current session's work has touched or closed. A gap
   that is now genuinely resolved does not get deleted in place — per the
   file's own maintenance rule, its one-liner *moves* to `docs/ADDENDA_LOG.md`
   § "Known Gaps — Resolved Items Archive" in this same session. Leaving a
   resolved item inline "to clean up later" is exactly the drift this repo has
   already been burned by once (see KNOWN_GAPS.md's own preamble).

4. **What the docs claim about *each other* — old entries vs. newer ones.**
   The checks above compare new work against the docs. This one compares the
   docs against themselves, because a doc entry is evidence of what was true on
   its own date, never of what is true now. Before trusting or citing any
   `docs/ADDENDA_LOG.md` entry — including a brand-new one you are about to
   write — grep the file for the same file path, function, column or behaviour
   it names, and read every older hit. If two entries assert opposite things
   about the same file or behaviour, **that is a stale-doc finding, handled
   exactly like an unmentioned commit in check 1**: read the actual code, decide
   which entry matches reality, and repair the wrong one in this same audit —
   never leave both standing for a later reader to arbitrate.

   Repair convention, since a dated entry is a historical record and must not be
   silently rewritten: correct the entry that is wrong **as of today**, and mark
   an entry that was accurate on its own date but has since been overtaken with
   a short `**(State as of YYYY-MM-DD only — superseded by § <Title>.)**` clause
   pointing at the entry that replaced it. Then check whether
   `docs/KNOWN_GAPS.md` or `CLAUDE.md` § 3 repeats the losing claim, and fix
   those in the same pass.

   This check exists because it was skipped once: the webhook path's email
   `.toLowerCase()` was added on 2026-07-26, yet a 2026-08-15 entry still listed
   it as "the webhook path and its known missing `.toLowerCase()`" — a fix that
   had shipped almost three weeks earlier, contradicted by three older entries in
   the very same file. Nothing in checks 1–3 could catch it, because no new
   commit was involved: the contradiction was entirely doc-vs-doc.

5. **Uncommitted work.** `git status --short` and `git diff --stat`. Anything
   sitting in the tree is not shipped — say "uncommitted in the working tree"
   explicitly in the handoff block, never fold it into "shipped."

6. **Unpushed commits.** `git status -sb`. A commit not on the remote has not
   deployed if this repo deploys off pushes (Vercel-style). Confirm the actual
   deploy trigger before asserting this — don't assume it if you haven't
   checked.

7. **Whether the gates in CLAUDE.md's own verification discipline actually
   pass**, if the handoff will claim anything is "done": `npm run build`,
   `npm run lint`, `npx tsc --noEmit`, `npm test`. A doc saying something is
   complete is not evidence; a green gate is closer to it, and CLAUDE.md itself
   says "verified" means the thing was actually run, not that it compiled.

8. **Migration / schema drift, only if the session touched the database.**
   `docs/SCHEMA_REFERENCE.md` is edited alongside migrations, so it is rarely
   stale — but if recent commits touch `supabase/migrations/` or similar, spot
   check that the doc reflects the latest one. Per CLAUDE.md's Supabase
   MCP tool-access rule, only read-only tools (`list_tables`, `get_advisors`,
   `execute_sql` SELECT-only) may be used to verify this — never `apply_migration`.

Then repair whichever doc is stale, using **that doc's own established
maintenance convention** — do not invent a new format:

- **CLAUDE.md § 3**: update an initiative's one-line disposition, or add a new
  initiative entry, following the existing `**Name (N prompts).** ✅/⬜
  <status>.` pattern. Full narrative never goes here — see the next bullet.
- **`docs/ADDENDA_LOG.md`**: append a new dated `## <Title> (YYYY-MM-DD)`
  section for anything shipped that has no narrative yet. Match the file's
  existing heading and prose style.
- **`docs/KNOWN_GAPS.md`**: add a bullet for anything newly and deliberately
  deferred (⬜, one to two sentences, dated, pointing at the fuller story in
  ADDENDA_LOG.md); relocate anything now fully resolved to ADDENDA_LOG.md's
  archive section per its own rule.

If all three were already accurate, say so plainly and change nothing.

**If any doc changed, commit it — the doc files touched, nothing else in the
tree.** Message: what was corrected and why (e.g. "KNOWN_GAPS.md: relocate the
resolved webhook-secret item, CLAUDE.md: mark Task/Calendar hardening
complete"). This is a doc-audit commit, not a feature commit — it must never
stage or commit unrelated dirty files even if the working tree has other
changes in progress. Rationale: CLAUDE.md's own Known Gaps rule already treats
an unrecorded disposition change as a bug; an audit that ends without
committing the fix reintroduces exactly the drift it exists to close, and the
handoff block below would be citing a doc state that isn't actually in the repo.

---

## Job 2 — print the handoff block

Output it as a fenced markdown block the user can copy whole. **Print it in the
response; do not write it to a file** — it is a message, not an artifact, and a
file would go stale the moment it is written.

Keep it under roughly 500 words. The planning Project has limited context and
already has the attached docs — this is not the place to re-derive them.

Structure:

```markdown
## TEKGUYZ CRM — handoff <YYYY-MM-DD>

**Deployed:** <what production is currently running — commit sha + one line, or "unverified — Vercel not checked this session">
**Repo:** <clean / N uncommitted files> · <in sync with remote / N unpushed>
**Gates:** <build/lint/typecheck/test — pass, or not run this session>

### Shipped since last handoff
- <one line per initiative or batch, with the measured figure that matters — test count, file count, whatever is real>

### This session
- <3-6 bullets: what was asked, what was decided, what was rejected and why>

### Open now
- <what is genuinely open, pulled from CLAUDE.md § 3 and docs/KNOWN_GAPS.md — measured only, not copied verbatim if a claim there is now stale>

### Needs the user, not more code
- <anything awaiting visual sign-off, a copy/product decision, a real device, or explicitly flagged in KNOWN_GAPS.md as "the owner's call">

### Attach to this Project
CLAUDE.md · docs/SCHEMA_REFERENCE.md · docs/ADDENDA_LOG.md ·
docs/KNOWN_GAPS.md · docs/DESIGN.md
```

Rules for the block:

- **Every claim measured.** If a figure was not verified this session, either
  verify it now or leave it out — do not carry forward a number from memory.
- **Rejections are load-bearing.** The planning Project writes the next brief;
  telling it what was considered and rejected stops it re-proposing that. This
  is the single highest-value part of the block, same as it is for any repo.
- **Name the reserved systems** — the multi-tenant security model, the
  Form/Action field-parity rule, the "a classifier verdict routes, never
  hides" rule, the Going Cold SLA treatment — if the session touched anything
  near them, so the planning Project doesn't propose around them blind.
- **No hedging and no filler.** "Design System v2 foundation shipped, 49 tests
  passing" or "Design System v2 foundation is uncommitted" — never "the design
  system is essentially done."
- The attach-list above is this repo's current doc set. If a new permanent doc
  is ever added (or one of these is retired), update the list here to match —
  don't let it silently drift from what CLAUDE.md's own Reference Index says.
