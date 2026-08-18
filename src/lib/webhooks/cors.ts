import { WEBHOOK_SIGNATURE_HEADER } from "@/lib/webhooks/signature";

// CORS on this route is vestigial, and the reason is worth writing down.
//
// It was added on 2026-07-24 on the belief that tekguyz.com's contact form
// called this endpoint straight from the browser. IT NEVER DID. That site's
// form has always posted through a Next.js Server Action
// (tekguyz-site: app/actions/contact.ts -> sendToCrm), which is a server-side
// fetch — no Origin header, no preflight, no CORS involvement of any kind.
// Confirmed by reading that repo on 2026-08-18.
//
// The belief was expensive in one direction: the site carried a comment saying
// "the CRM's CORS allows no other header, and a custom one fails preflight",
// and that is why adding a signed header looked impossible from its side.
// Both repos are corrected now.
//
// Kept rather than deleted, deliberately: it costs nothing, it keeps OPTIONS
// well-formed, and it lets a developer poking at the endpoint from the real
// origin read a 401 body instead of an opaque network error. It is NOT a
// tenant boundary and never was — the signature is. If a future pass wants to
// delete this file, nothing real depends on it; check for a browser caller
// first.
export const ALLOWED_ORIGIN = "https://tekguyz.com";

export const CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // The signature header is listed so a preflight does not reject the request
  // before the route ever sees it. Content-Type alone would.
  "Access-Control-Allow-Headers": `Content-Type, ${WEBHOOK_SIGNATURE_HEADER}`,
  "Access-Control-Max-Age": "86400",
};
