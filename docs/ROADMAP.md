# TEKGUYZ CRM — Roadmap

A register of **not-yet-started** future initiatives and open product
decisions. Created 2026-08-27, because forward-looking ideas from planning
sessions had no home this repo's tooling reads.

## How to maintain this file

- This file holds ideas that have **never been started**. `docs/KNOWN_GAPS.md`
  holds deferred edges of *shipped* work; CLAUDE.md § 3 holds initiatives
  already started or complete. An idea that fits either of those does not
  belong here.
- Every entry is one to three sentences, dated, and carries a status tag:
  **idea** / **needs discovery** / **decision pending** / **rejected — revisit
  trigger**. This file must not become a second `KNOWN_GAPS.md`.
- An item leaves this file the moment a prompt pack starts work on it — it
  becomes a CLAUDE.md § 3 initiative at that point. Nothing here is a permanent
  resident.
- No design decisions are embedded in an entry beyond what is already decided.
  A known fork (e.g. session timeout) is a constraint, not a decision.
- An item with no date is stale. Re-triage it before relying on it.

## Open items

- **Two-factor authentication (2FA)** — *idea* (2026-08-27). No urgency, not
  started.
- **Session timeout management** — *decision pending* (2026-08-27). It forks
  into Supabase JWT-expiry config vs. an app-side idle timer, and those are
  different builds. The fork must be decided before it can even be scoped for
  discovery.
- **Notification center** — *idea* (2026-08-27). Not started.
- **RESTful API** — *rejected — revisit trigger* (2026-08-27). No second
  external consumer exists beyond the one real webhook caller
  (`tekguyz-site`). Revisit only when an actual second consumer appears, not
  on "it'd be nice."
- **Avatar images (small profile photos)** — *idea* (2026-08-27). Not started.
  If picked up, recommend initials-first (hash-based colour, zero storage),
  with real photo upload as a separate later feature.
- **Unstructured-input lead creation** ("dump a note/link/text, extract
  fields") — *needs discovery* (2026-08-27). Any implementation must keep a
  human confirming before insert, the same governance as the planned lead
  enrichment work — never auto-create a lead from extracted text.
- **Data history / audit trail** — *needs discovery* (2026-08-27). Open
  question, not a confirmed gap. Verify against `activity_logs`' actual schema
  (field-level diffs vs. event types only) before deciding whether more work is
  needed.
- **Help system v2 / more comprehensive docs** — *idea* (2026-08-27). Not
  started.
- **Smart patterns / shortcuts for everyday tasks** — *needs discovery*
  (2026-08-27). Too vague to action; needs a concrete example before it is a
  real item.

## Phase queue

Previously informal, formalised here 2026-08-27. Order is intent, not a
commitment; an item moves to CLAUDE.md § 3 when its prompt pack starts.

- **P1 — Login/landing redesign.** *Partially shipped 2026-09-04, narrowed
  2026-09-05.* The public entry route now exists as `/demo`, a read-only demo
  identity linked from tekguyz.com — that closes the "no genuinely public
  route" half of this item. `/login` now also carries its own **View demo**
  link, so a visitor arriving at the production URL directly is no longer stuck
  at a wall. Full history: `docs/addenda/2026-09.md` § 2026-09-04 and
  § 2026-09-05, status row in CLAUDE.md § 3. Note the `robots: noindex` revisit
  trigger recorded in `docs/KNOWN_GAPS.md` has now fired — `/demo` is a public
  route — and was deliberately not acted on; see that file.

  Three pieces of this item were considered on 2026-09-05 and deliberately
  deferred:
  - **Self-serve signup** — *rejected — revisit trigger* (2026-09-05). The
    business model is invite-only / sales-assisted, not SaaS: accounts are
    provisioned by hand for one or two trusted collaborators. Public signup was
    live on `/signup` and was closed the same day (see CLAUDE.md
    § Multi-Tenant Security Model, rule 7). Same shape as the **RESTful API**
    rejection above — not a closed door. Revisit when the product is actually
    being sold self-serve, with a billing model and ToS behind it; not on "it'd
    be nice".
  - **Marketing landing page** — *deferred* (2026-09-05). A landing page's job
    is conversion, and with no self-serve signup there is nothing to convert
    into. `/demo` plus tekguyz.com's own case study already fill that role.
    Unblocks when self-serve signup does.
  - **Onboarding** — *deferred* (2026-09-05). The `/onboarding` route exists
    and was never designed. Deferred until an actual invite is imminent, so it
    is designed against a real first user rather than an imagined one.

  **Still open and unspecced:** the redesigned `/login` itself.
- **P2 — Observability + error tracking + webhook rate limiting.**
- **P3 — Webhook replay protection.** Depends on P2; a breaking protocol
  change.
- **P4 — Cheap registered gaps in one wave:** CSV export, `/reports` period
  filter, dead CSS.
- **P5 — Lead enrichment** via an append-only `lead_enrichments` table, with a
  mandatory human-apply step.
- **P6 — PWA** with push notifications only; offline explicitly declined.
- **P7 — Skills/hooks/onboarding docs.**
