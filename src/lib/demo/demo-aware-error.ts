import "server-only";
import { getCurrentOrg } from "@/lib/organizations/current";
import { DEMO_READ_ONLY_DIGEST, DEMO_READ_ONLY_MESSAGE } from "@/lib/demo/read-only-refusal";

// What a write action throws instead of a raw Supabase error:
// `if (error) throw await demoAwareError(error);`
//
// It changes ONE case and passes every other error through untouched, as the
// same object: a 42501 (insufficient_privilege) inside the public demo tenant.
// That is the demo_readonly role refusing a write, and it is tagged with a
// fixed digest so the error boundary can say "this demo is read-only" instead
// of looking like a crash.
//
// Both conditions are required, and that is the whole point.
// - 42501 alone is NOT a demo refusal. Real tenants raise it too: the leads
//   role trigger, the team-management RPCs, and a plain RLS WITH CHECK denial.
//   Relabelling those as "read-only" would lie to a real operator.
// - The demo tenant alone is NOT a refusal. Any other error in the demo is a
//   real bug and must still reach the real error boundary.
//
// Presentation only. Nothing here decides what gets refused; the database
// already did that, below RLS, before this runs.
export async function demoAwareError(error: unknown): Promise<unknown> {
  if (!(await isDemoRefusal(error))) return error;

  const message = (error as { message?: unknown }).message;
  return Object.assign(
    new Error(`Demo read-only refusal: ${typeof message === "string" ? message : "42501"}`, {
      cause: error,
    }),
    { digest: DEMO_READ_ONLY_DIGEST },
  );
}

// The return-path twin, for actions that hand their error back into a form as
// `{ error }` and so never reach a boundary:
// `return { error: await demoAwareMessage(error, error.message) };`
//
// `message` is what the caller would have returned anyway — the raw text, or
// its own translation. It comes back unchanged unless this is a demo refusal.
// A caller with a sentinel translator (role-errors, team-errors) should use
// its translation first and only fall through to this for an unrecognised
// error, so a deliberate RAISE keeps its own explanation.
export async function demoAwareMessage(error: unknown, message: string): Promise<string> {
  return (await isDemoRefusal(error)) ? DEMO_READ_ONLY_MESSAGE : message;
}

async function isDemoRefusal(error: unknown): Promise<boolean> {
  if (!error || typeof error !== "object" || (error as { code?: unknown }).code !== "42501") {
    return false;
  }

  // cache()-wrapped per request, so this is free when the page already
  // resolved the org, and one query when an action runs on its own.
  const { isDemo } = await getCurrentOrg();
  return isDemo;
}
