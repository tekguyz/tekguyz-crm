# Each Guest gets their own Demo Org

The first public demo signed every visitor in to one shared, read-only account over one org ("TEKGUYZ Demo"), through `GET /demo`. It broke the owner's demo standard (`claude-config/DEMO-STANDARD.md`) three ways: a GET signed people in, there was no Landing Page, and the demo could not write (#21). A prefetch of that GET replaced a real session on 2026-09-11.

So "Try the demo" is now a button on the Landing Page that runs a Server Action. Each press makes a new Guest, who is the OWNER of a new Demo Org filled with the existing Sample Data. The same design as `realstone-field-ops` ADR 0006.

- **Identity.** The server makes a user with a random `@tekguyz-crm.test` email and signs it in, like `/api/dev-login`. Not Supabase anonymous sign-in: its per-IP limit would count every press as the one Vercel server. This is the only path besides an invite that creates an account, and it creates only `.test` users.
- **Walls.** Every RLS policy already keeps a member inside their own organization, so an org per Guest needs no new policy to wall Guests off.
- **No teammates.** The Guest is the only member. Nothing invented is made beyond the Sample Data.
- **Demo Blocks.** Email, audio transcription, credentials, the webhook secret, invites and CSV import are refused on the server for a Demo Org, with one message linking to tekguyz.com/contact.
- **Cleanup.** A daily Vercel cron deletes Demo Orgs and their Guests older than 7 days. A per-hour cap limits new Demo Orgs.
- **Retired.** The shared read-only account, the `demo_readonly` role and the `DEMO_VISITOR_*` env vars are removed. `GET /demo` only redirects to the Landing Page. "TEKGUYZ Demo" stays, for `/api/dev-login` only.

## Considered Options

- **One shared read-only sample org, with each Guest's own writes private** (`squid-ink` ADR 0001). Fewer rows per press, but a Guest could not edit a sample lead, and every policy would need a "sample or mine" case.
- **Keep `demo_readonly` and open holes in it for writes.** Rejected in #21: a hole in a read-only role is a hole for every visitor at once.

## Consequences

- Each press makes one user and about 50 small rows. The cap and the 7-day cleanup keep that small.
- `organizations.is_demo` now marks many orgs, not one. Anything that reads it must not assume a single demo org.
