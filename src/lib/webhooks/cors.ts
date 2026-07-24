// The triage endpoint was built for server-to-server POSTs (Prompt 11:
// Zapier, etc.), but tekguyz.com's own contact form calls it directly from
// the browser, which needs real CORS headers — a browser blocks a
// cross-origin fetch()'s response from being read by JS regardless of what
// the route itself validates, unlike a server-to-server call which never
// enforces CORS at all. Deliberately a single static allowed origin, not a
// wildcard and not an echo of the request's own Origin header: this is a
// public write endpoint already tenant-scoped by the secret in the URL, not
// by origin, so there's no reason to widen it past the one real browser
// caller. Confirmed live (2026-07-24): https://tekguyz.com resolves with no
// www redirect, so that's the exact origin to allow — not tekguyz.com and
// www.tekguyz.com both.
export const ALLOWED_ORIGIN = "https://tekguyz.com";

export const CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
