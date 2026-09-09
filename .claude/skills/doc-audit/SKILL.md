---
name: doc-audit
description: Audit CLAUDE.md § 3, docs/ADDENDA_LOG.md, docs/KNOWN_GAPS.md, docs/SCHEMA_REFERENCE.md's inventories and docs/DESIGN.md's token tables against the real repo state, then repair whichever is stale and commit the doc files. Use when the user asks for a doc audit, says the docs are stale, or when the handoff skill reports a check finding it could not resolve. This is the heavy pass — the handoff skill does not run it.
---

# Doc audit — measure the docs against the repo, repair what drifted

This is the expensive half of what used to be one `handoff` skill. It was split
on 2026-09-08 because the cheap half ran several times a day and paid for this
half every time.

**Run this when a doc is actually suspect**, not on every handoff:

- `npm run check:docs` or `npm run check:residue` reported a finding the
  `handoff` skill could not resolve from script output alone
- a session shipped work that needs a new addendum or a § 3 status row
- the user asks for a doc audit, or says something in the docs looks wrong

The `handoff` skill runs the same scripts but reads only their **output**. It
never opens a whole doc. That is the whole point of the split — do not
reintroduce doc reading there.

## Where status lives in this repo

tekguyz-crm has **no single `STATUS.md`.** That job is deliberately split three
ways, per this repo's own documented discipline (CLAUDE.md's Reference Index and
its "Build discipline" / Known-Gaps rules):

| What STATUS.md would hold elsewhere | Lives here in |
|---|---|
| Current initiative status, what shipped | `CLAUDE.md` § 3 "Post-Launch Feature Work" |
| Dated build narrative, the "why" behind decisions | `docs/addenda/*.md`, indexed by `docs/ADDENDA_LOG.md` |
| Deliberately deferred / open work | `docs/KNOWN_GAPS.md` |
| Live DB schema, RLS, RPCs | `docs/SCHEMA_REFERENCE.md` (rarely stale — it's edited alongside migrations, not after the fact) |

Do not create a `docs/STATUS.md` to consolidate these. This repo hit 150KB and
two emergency compressions specifically from letting status content accumulate
in one place instead of staying split by responsibility — see CLAUDE.md's own
compression history in `docs/ADDENDA_LOG.md`.

`docs/DESIGN.md` is not a status file and is not part of that split — but it
does hold a *copy* of values that live for real in `src/app/globals.css`, so it
can go stale in a way no status audit would catch. Check 9 covers it.

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

9. **`docs/DESIGN.md` token drift against `src/app/globals.css` — every run,
   no exceptions.** CLAUDE.md names `globals.css` as the single source of truth
   for every token value and warns that "a doc copy can only drift."
   `docs/DESIGN.md` carries exactly such a copy, in three tables, and until this
   check existed nothing ever compared the two — DESIGN.md was named in the
   attach-list below but never opened. Run:

   ```bash
   node scripts/check-design-drift.mjs
   ```

   Checks 9, 10 and 11 are all repo-only and are wired together as one npm
   script — `npm run check:docs` runs the three in order and is the normal way
   to invoke them. Run them individually only when one has already failed and
   you are iterating on it.

   It parses DESIGN.md's three value tables — § Color Tokens (OKLCH) plus
   § Additions beyond the original v2 draft, § Typography, § Border Radius Scale
   — and compares each stated value against the matching custom property in
   `globals.css` (`:root, .light` and `.dark` for colours, `@theme inline` for
   type and radius). It compares numerically, so `oklch(1.00 0.000 0)` and
   `oklch(1 0 0)` are equal and trailing zeros are never a finding. Exit `0` is
   clean, `1` is drift with one line per mismatch, `2` means the check could not
   read a table and **is not a pass** — fix the script before continuing.

   **Handling a finding.** This check is drift *detection*, not repair-by-guess.
   Neither file is automatically right: `globals.css` is the source of truth for
   what the app actually paints, but a mismatch can equally mean someone edited
   CSS without updating the spec, or that DESIGN.md records a decision the CSS
   never received. Read both, decide which matches the intended decision, fix
   that one, and **list every mismatch under `### Open now` in the handoff block
   below even if you repaired it in this session** — with what drifted and which
   way it was resolved. Never let the check pass silently into the block.

   Keep it to stated values. Do **not** widen this into contrast checking,
   accessibility auditing, or reviewing components against the spec — that is a
   design QA pass, it is not cheap, and it does not belong in a handoff. No
   browser, no dev server, no database.

10. **Assertion drift — figures the docs state, against the same figures
    measured now. Every run, no exceptions.** Checks 1–8 are all
    **change-driven**: each starts from a commit, from what this session
    touched, or from a doc entry you are about to cite. That leaves a hole a
    doc can rot in quietly — a figure measured correctly once, never revisited,
    with no commit and no contradiction to trip any earlier check.

    That hole is not hypothetical. `docs/KNOWN_GAPS.md` carried "92 tests, 15
    suites" for two sessions after `94de14b` made it 100/17 — **through a full
    handoff audit that ran `vitest`, saw `100/17` on screen, and never compared
    the two numbers.** It was caught by an outside reader of the handoff block,
    not by this skill. Check 9 already proves the remedy: a script, run every
    time, that cannot be reasoned past under context pressure. Run:

    ```bash
    node scripts/check-doc-figures.mjs
    ```

    It checks three things, all repo-only — no browser, no dev server, no
    database, same fence as check 9:

    - the **`**N tests, M suites**`** mark in `docs/KNOWN_GAPS.md` against a real
      `vitest run --reporter=json` (per-file counts, not estimated — a grep for
      `it(` undercounts and will invent a phantom discrepancy);
    - every `SECURITY DEFINER` function defined in `supabase/migrations/`
      against the inventory table in `docs/SCHEMA_REFERENCE.md`, which calls
      itself a *running* inventory, so an omission is a real gap. This found
      `vault_get_org_credential` — live since Prompt 13a, named in CLAUDE.md
      § Multi-Tenant Security Model, and absent from that table for weeks;
    - that the newest file in `supabase/migrations/` is named somewhere in
      `docs/SCHEMA_REFERENCE.md`, since CLAUDE.md requires the two be edited
      together.

    Exit `0` clean, `1` drift with one line per finding, `2` means it could not
    read or run something and **is not a pass** — fix the script before
    continuing, exactly as with check 9.

    **One known flake, and only one.** `CANNOT RUN vitest for the test-count
    check — Command failed: npx vitest run …` on the *first* run of a session is
    usually a cold-start timeout, not a broken script. Run `npm run check:docs`
    a second time before treating it as real. If it fails twice, it is real —
    reproduce it with `npx vitest run --reporter=json --silent` directly, which
    prints the actual cause the script swallows to its first line.

    **Handling a finding.** For a count, the measurement wins and the doc gets
    corrected — a stated figure is a mirror, not a dated historical record, so
    it is edited in place with no "superseded" clause. Refresh the *whole*
    claim, not just the digits: carry the previous mark into the bullet's
    history chain so the trail stays readable. **List every finding under
    `### Open now` in the handoff block even when you repaired it this
    session**, same rule as check 9.

    **This check is not a substitute for thinking.** It covers the three
    countable claims that exist today. If you measure any *other* figure during
    an audit — an advisor count, a bullet count, a file count, a coverage
    percentage — grep the docs for it before you report it. The failure this
    check exists to close was not a missing script; it was having the number in
    hand and not looking.


11. **Reference integrity — every `§` pointer still resolves. Every run, no
    exceptions.** This repo navigates entirely by section pointer, and nothing
    renders one into a link. A pointer that no longer resolves therefore fails
    in the worst possible way: silently, looking exactly as authoritative as one
    that works, until a reader goes looking and finds nothing. Run:

    ```bash
    node scripts/check-section-pointers.mjs
    ```

    Three deterministic checks, repo-only — no browser, no dev server, no
    database, same fence as checks 9 and 10:

    - every `§ <Title>` citation across CLAUDE.md, the three docs, the addenda
      and this skill resolves to a real heading or index title;
    - every row in `docs/ADDENDA_LOG.md`'s index points at a section that is
      actually in the file it names;
    - every `##` section in `docs/addenda/*.md` has an index row.

    That third direction is the one that decays with normal use, and it is the
    one the repair convention above can create: append an addendum to a month
    file, forget the index row, and the section is unreachable by every
    cross-reference in the repo while checks 1–10 all stay green. The 2026-08-18
    split verified 55 pointers by hand once; this keeps them verified.

    Exit `0` clean, `1` findings, `2` could not read something and **is not a
    pass** — fix the script before continuing, exactly as with checks 9 and 10.

    **Handling a finding.** A dangling pointer is repaired by finding the real
    title, not by deleting the citation. An unindexed section gets its index
    row. List each finding under `### Open now`, same rule as checks 9 and 10.

12. **Live test residue. Every run, no exceptions — and this is the one check
    in the audit that touches the network.** CLAUDE.md § Test-Data Cleanup is a
    permanent rule that has been broken twice anyway: sixteen test leads in the
    real TEKGUYZ org over three weeks, then two MEMBER memberships and two
    ACCEPTED invites found sitting in `TEKGUYZ Demo` on 2026-08-18. Neither was
    a knowledge failure — the rule was written, correct and read. Nothing looked.
    Run:

    ```bash
    npm run check:residue
    ```

    It needs `.env`, which is why it goes through the npm script. **SELECT
    only.** It never writes and deliberately cannot: CLAUDE.md requires removal
    to be a human-run `DELETE` or a disposable service-role script, never an
    agent write against a `public` table. So a finding prints the scoped
    `SELECT` and `DELETE` for the user to run, and stops there. **Hand those to
    the user; do not run them.**

    It checks the demo org against what `scripts/seed/lib/demo-org.ts` actually
    creates — one OWNER membership, zero invites, so anything else is residue by
    construction and `npm run seed:demo` will never clear it — and every org for
    leads on a throwaway email domain, which is the shape the sixteen leads had.
    `archived` is deliberately not a filter: archiving is not removal, and that
    is precisely how the last batch stayed hidden.

    Exit `0` clean, `1` residue found, `2` could not check and **is not a pass**.

    **Handling a finding.** Residue found by an audit is not this session's
    residue to quietly absorb — list it under `### Needs the user, not more
    code` with the removal SQL, because only the user can run it.

13. **Exclusion pass — the permanently-rejected list. Every run, and before
    any drafting.** Read `docs/KNOWN_GAPS.md` § "Permanently rejected — never
    re-list". Everything named there is **struck from this audit's output**: it
    may not appear under `### Open now`, may not appear under `### Needs the
    user, not more code`, and may not be raised as a finding anywhere — no
    matter which source surfaced it.

    Three sources will keep surfacing those items, and all three are working
    correctly:

    - `docs/ADDENDA_LOG.md` history, which checks 1 and 4 read constantly and
      which is deliberately left intact — a dated entry is a record, not a
      to-do;
    - a live `get_advisors` run under check 8, which re-lints a rejected item
      every single time and always will;
    - an open `KNOWN_GAPS.md` bullet that *neighbours* a rejected item without
      naming it — the `get_advisors` findings bullet is exactly that shape.

    Surfacing is expected. **Reporting is the bug.** Apply this filter to the
    findings list before job 2 begins, not while writing the block — an item
    that reaches the drafting step reads exactly like a real one, because by
    then it is only prose.

    This check exists because `### Needs the user, not more code` is drafted by
    hand, not generated by a script, so nothing mechanical guards it.
    `docs/ADDENDA_LOG.md` says of Leaked Password Protection: "This is the one
    item in this whole file that needs a human dashboard action, not a code
    fix." That sentence matches the section's own name almost verbatim, and
    nothing in checks 1–12 can catch it — nothing is stale. The history is
    correct, `docs/KNOWN_GAPS.md` is already clean, and the advisor warning is
    genuinely live. The only defence is an explicit exclusion list, applied
    before drafting.

    A rejected item is never "resolved," so it never moves to the Resolved
    Items Archive, and it never gets re-litigated in a handoff. If the owner
    changes their mind, they say so and the entry is deleted — that is the only
    way it comes back.


Then repair whichever doc is stale, using **that doc's own established
maintenance convention** — do not invent a new format:

- **CLAUDE.md § 3**: update an initiative's one-line disposition, or add a new
  initiative entry, following the existing `**Name (N prompts).** ✅/⬜
  <status>.` pattern. Full narrative never goes here — see the next bullet.
- **`docs/addenda/<month>.md`**: append a new dated `## <Title> (YYYY-MM-DD)`
  section for anything shipped that has no narrative yet, to the month file that
  matches its date (`docs/addenda/2026-08.md` and so on). Match the existing
  heading and prose style. **Then add its row to the index table in
  `docs/ADDENDA_LOG.md`** — that index is what makes every
  ``docs/ADDENDA_LOG.md § <Section Title>`` pointer in the repo resolve, and a
  section missing from it is unreachable by every cross-reference. The log was
  split on 2026-08-18 (419 KB, 68 sections, ~103k tokens in one file; 77 sections
  across the four month files as of 2026-08-25, with the index itself down to
  ~12 KB); reading it whole is no longer the way to consult it — read the index,
  then the one file you need.
- **`docs/KNOWN_GAPS.md`**: add a bullet for anything newly and deliberately
  deferred (⬜, one to two sentences, dated, pointing at the fuller story in
  ADDENDA_LOG.md); relocate anything now fully resolved to ADDENDA_LOG.md's
  archive section per its own rule.
- **`docs/DESIGN.md`**: only when check 9 says its stated value is the wrong
  one. Edit the table cell in place to the value `globals.css` actually carries
  — a token table is a mirror of the CSS, not a dated historical record, so it
  gets corrected rather than annotated with a "superseded" clause. If instead
  the CSS is what drifted, DESIGN.md is untouched and the fix lands in
  `src/app/globals.css`, which makes it a **code** change, not a doc-audit
  change: keep it out of the doc-audit commit below.

If all were already accurate, say so plainly and change nothing.

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
