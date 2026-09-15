// Shared by the server (which tags the error) and the error boundaries (which
// read the tag). A plain module on purpose: a constant exported from a
// "use client" file arrives in a Server Component as nothing, and a
// "use server" file may not export one at all.
//
// WHY A DIGEST, AND NOT THE ERROR'S CODE OR MESSAGE.
// A production build redacts a Server Action's thrown error before it reaches
// the browser: React Flight sends the `digest` and nothing else, so `code` and
// `message` are simply not there on the client. Next keeps a digest the thrown
// Error already carries instead of hashing a new one
// (create-error-handler.js, "respect the original digest"), so a fixed digest
// is the one field that survives the trip.
//
// The digest means BOTH "Postgres refused with 42501" AND "the tenant is the
// public demo". demoAwareError decides that on the server, where is_demo is
// known. Neither fact alone is enough — see demo-aware-error.ts.
export const DEMO_READ_ONLY_DIGEST = "TEKGUYZ_DEMO_READ_ONLY";

// The copy, shared by the boundary card (DemoReadOnlyNotice) and by every
// action that returns its error inline into a form (demoAwareMessage), so the
// two ways a refusal can surface can never say different things.
export const DEMO_READ_ONLY_TITLE = "This demo is read-only";
export const DEMO_READ_ONLY_BODY =
  "You can look around, but changes are not saved here. Nothing is broken — that change was blocked on purpose.";
export const DEMO_READ_ONLY_MESSAGE = `${DEMO_READ_ONLY_TITLE}. ${DEMO_READ_ONLY_BODY}`;

export function isDemoReadOnlyRefusal(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { digest?: unknown }).digest === DEMO_READ_ONLY_DIGEST;
}
