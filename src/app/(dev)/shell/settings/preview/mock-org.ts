// STATIC FIXTURE for the Settings → Org Profile & Branding comps —
// Shell/IA Stage 1, prompt 4 of 4. Nothing here is fetched, seeded, written or
// read, and no Server Action is reachable from any file in this directory.
//
// PLAIN MODULE, no directive — a "use client" file's plain constants arrive as
// nothing in a Server Component, so both the server pages and the client
// blocks read this one.
//
// EVERY FIELD IS A REAL COLUMN ON public.organizations, checked against the
// DDL in docs/SCHEMA_REFERENCE.md rather than guessed: id, name,
// webhook_secret, timezone, currency_format, created_at. That is the whole
// table. Nothing else on this page is invented.
//
// WHICH IS WHY THERE IS NO LOGO UPLOAD HERE. "Branding" on this surface means
// the mark the app already ships and the two rules that govern it — the
// light/dark asset swap and the reduced form at small sizes. A per-org logo
// would need a column, a storage bucket, an upload action and a moderation
// answer; drawing an upload control would be inventing a data model, which is
// the same trap detail/preview/PanelChrome.tsx refused when it declined to put
// a photo on the avatar.

export type OrgProfileValues = {
  name: string;
  timezone: string;
  currency_format: string;
};

export const MOCK_ORG: OrgProfileValues = {
  name: "TEKGUYZ",
  timezone: "America/New_York",
  currency_format: "USD",
};

// THE STRESS CASE, for scripts/check-comp-text-widths.mjs rather than for
// looks. A long trading name plus the longest curated timezone label is what
// squeezes a label/value row; the ordinary fixture above never would.
export const MOCK_ORG_LONG: OrgProfileValues = {
  name: "Northwood Facilities Management & Contracting Group",
  timezone: "America/Argentina/Buenos_Aires",
  currency_format: "NZD",
};

// Shaped exactly like the real one — the app URL, then /api/v1/triage/ and the
// organization id — because the whole point of showing it is that it is long
// and has to truncate somewhere. It is not a credential: the URL carries the
// org id and grants nothing on its own, which is what the copy beside it says.
export const MOCK_WEBHOOK_URL =
  "https://crm.tekguyz.com/api/v1/triage/9f2c41a8-0d7b-4e55-9a10-6c3be48f1d27";

// OBVIOUSLY NOT A SECRET, and shaped to look like one only so the row it sits
// in is the right width. The real value is a UUID read through an
// OWNER/ADMIN-only RPC and never lands in a comp.
export const MOCK_SIGNING_SECRET = "0000example-0000-comp-only-000000000000";
