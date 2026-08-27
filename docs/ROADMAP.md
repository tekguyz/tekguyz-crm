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

- **P1 — Login/landing redesign.** No schema changes, highest visibility. Three
  pieces raised 2026-08-15 and never specced: a pre-auth landing page (no such
  route exists — `/` is auth-gated), a redesigned `/login`, and a real
  onboarding experience (the `/onboarding` route exists but was never
  designed). A genuinely public marketing route is the one trigger named by the
  `robots: noindex` decision in `docs/KNOWN_GAPS.md` for revisiting per-path
  indexing.
- **P2 — Observability + error tracking + webhook rate limiting.**
- **P3 — Webhook replay protection.** Depends on P2; a breaking protocol
  change.
- **P4 — Cheap registered gaps in one wave:** CSV export, `/reports` period
  filter, dead CSS.
- **P5 — Lead enrichment** via an append-only `lead_enrichments` table, with a
  mandatory human-apply step.
- **P6 — PWA** with push notifications only; offline explicitly declined.
- **P7 — Skills/hooks/onboarding docs.**
