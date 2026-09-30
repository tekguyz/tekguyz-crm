<p align="center"><img src="docs/banner.svg" alt="TEKGUYZ CRM" width="100%"></p>

<p align="center">
  <img src="https://img.shields.io/badge/status-in%20production-3063d3?labelColor=f8f8fa" alt="status: in production">
  <img src="https://img.shields.io/badge/Next.js-15-0a0b0d?labelColor=f8f8fa" alt="Next.js 15">
  <img src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3063d3?labelColor=f8f8fa" alt="Supabase">
  <img src="https://img.shields.io/badge/tests-vitest-2fa679?labelColor=f8f8fa" alt="tests: vitest">
</p>

**A multi-tenant sales CRM: every lead, one pipeline.**
[Live demo](https://tekguyz-crm.vercel.app/demo) · read-only, sample data

## Status

| Row | |
|---|---|
| Phase | In production. Post-launch feature work. |
| Shipped | Leads and pipeline, tasks, contacts, prospects, reports, team roles, command palette. Demo: each Guest gets their own writable Demo Org (#31). |
| Next | Demo Landing Page (#32), then retire the old demo role (#33). See `docs/INITIATIVES.md`. |
| Updated | 2026-09-29 |

## What it does

- Tracks each lead from first enquiry to won, lost or abandoned.
- Takes leads from the tekguyz.com form over a signed webhook.
- Flags leads that go cold, and keeps tasks and follow-ups.
- Stages cold prospects from CSV. A human promotes each one to a lead.
- Reports by period, with CSV export.
- Has team roles (owner, admin, member) and per-lead owners.
- Searches everything with a command palette.
- Offers a read-only public demo.

## What it never does

- It never hard-deletes a lead. Removal means `archived`.
- It never lets automation hide a lead. A classifier routes a lead only.
- It never estimates revenue. A human sets the outcome.
- It never opens signup. Accounts are invite-only.
- Tenant isolation is Postgres RLS, not app code.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind 4, Radix primitives |
| Database and auth | Supabase (Postgres, RLS, Vault) |
| Rate limits | Upstash Redis |
| Email and AI | Resend, Gemini |
| Hosting | Vercel. `main` deploys on push. |

## Run it locally

You need Node 20 or newer and a Supabase project.

```bash
npm ci
npm run dev
```

Copy your values into `.env.local`. The app stops at boot if one is missing.

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Supabase project settings |
| `PLATFORM_GEMINI_API_KEY` | Google AI Studio |
| `PLATFORM_RESEND_API_KEY` | Resend |
| `CRON_SECRET` | Any long random string |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash. The demo's hourly caps need it; without it "Try the demo" says busy. |

Never commit `.env` files. Secrets live in `.env.local` and in Vercel.
In development, `GET /api/dev-login` signs in a test account.

## Tests

```bash
npm run test:unit
npm run test:integration
```

Never `npm test`. It stops on purpose. `test:integration` needs `.env`, changes a real database, and runs one file at a time. CI runs `typecheck`, `test:unit` and `build` on every PR.

## Docs

- [`PRODUCT.md`](PRODUCT.md) — users, purpose, principles
- [`DESIGN.md`](DESIGN.md) — design system
- [`CLAUDE.md`](CLAUDE.md) — permanent build rules
- [`docs/SCHEMA_REFERENCE.md`](docs/SCHEMA_REFERENCE.md) — live schema
- [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) — the seven security rules
- [`docs/INITIATIVES.md`](docs/INITIATIVES.md) — feature status
- [`docs/ROADMAP.md`](docs/ROADMAP.md) and [`docs/KNOWN_GAPS.md`](docs/KNOWN_GAPS.md) — what is next and what is deferred

---

<p align="center"><sub>Built by <a href="https://tekguyz.com">TEKGUYZ</a></sub></p>
