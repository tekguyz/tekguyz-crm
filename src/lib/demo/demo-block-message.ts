// The Demo Block's words and its tag (CONTEXT.md: Demo Block). Shared by the
// server, which tags a refusal, and by the error boundaries and forms, which
// show it. A plain module on purpose: a constant exported from a "use client"
// file arrives in a Server Component as nothing, and a "use server" file may
// not export one at all.
//
// WHY A DIGEST, AND NOT THE ERROR'S CODE OR MESSAGE.
// A production build redacts a Server Action's thrown error before it reaches
// the browser: React Flight sends the `digest` and nothing else, so `message`
// is simply not there on the client. Next keeps a digest the thrown Error
// already carries instead of hashing a new one (create-error-handler.js,
// "respect the original digest"), so a fixed digest is the one field that
// survives the trip.
export const DEMO_BLOCK_DIGEST = "TEKGUYZ_DEMO_BLOCK";

export const DEMO_BLOCK_TITLE = "Not available in the demo.";
export const DEMO_BLOCK_PITCH = "Want this working for your business?";
export const DEMO_BLOCK_LINK_TEXT = "Talk to TEKGUYZ →";
export const DEMO_BLOCK_CONTACT_URL = "https://tekguyz.com/contact";

// The one-line form of the same refusal, for an action that returns its error
// into a form as text. Plain text cannot carry a link, so it names the address.
export const DEMO_BLOCK_MESSAGE = `${DEMO_BLOCK_TITLE} ${DEMO_BLOCK_PITCH} Talk to TEKGUYZ at tekguyz.com/contact.`;

export function isDemoBlock(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { digest?: unknown }).digest === DEMO_BLOCK_DIGEST;
}
