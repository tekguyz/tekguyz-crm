import "server-only";
import { getCurrentOrg } from "@/lib/organizations/current";
import { DEMO_BLOCK_DIGEST } from "@/lib/demo/demo-block-message";

// The Demo Block's one server-side check (CONTEXT.md: Demo Block).
//
// Keyed off the CURRENT org's is_demo, never off a user id or an email, so it
// holds for every Guest's Demo Org and for TEKGUYZ Demo alike. Every action
// that costs money or reaches the outside world asks this first, before any
// write or outside call:
//   - saving or clearing credentials (credentials-actions.ts)
//   - reading or rotating the webhook signing secret (organizations/)
//   - creating an invite (invites/actions.ts)
//   - CSV import, leads and prospects (import-actions.ts, prospect-import-actions.ts)
//   - audio transcription (activity/actions.ts)
// Email is blocked where it is sent, not here: those senders run with no
// session (a webhook, a cron), so they check the org with isDemoOrg instead.
//
// It is on the server because a Server Action is a public HTTP endpoint.
// Hiding a button would stop nobody who calls the action directly.
//
// getCurrentOrg is cache()-wrapped per request, so this is free when the page
// already resolved the org, and one query when an action runs on its own.
export async function isDemoSession(): Promise<boolean> {
  const { isDemo } = await getCurrentOrg();
  return isDemo;
}

// For an action that throws rather than returning its error. The digest is
// what the error boundaries and the audio note read (demo-block-message.ts).
export function demoBlockError(): Error {
  return Object.assign(new Error("Not available in the demo."), { digest: DEMO_BLOCK_DIGEST });
}
