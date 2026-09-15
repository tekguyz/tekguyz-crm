// STATIC FIXTURE for the /login redesign comps — P1 login redesign, Stage 1.
// Nothing here signs anyone in. No file in this directory imports
// src/lib/auth/actions.ts, and the form in preview/LoginForm.tsx cancels its
// own submit.
//
// PLAIN MODULE, no directive — a "use client" file's plain constants arrive as
// nothing in a Server Component, so the server pages, the client form and the
// tests all read this one.
//
// THE THREE STATES ARE THE REAL PAGE'S THREE STATES. The shipped /login reads
// `error` and `message` from its query string and renders at most a banner
// for each above the form. `error` is whatever Supabase's signInWithPassword
// returned; `message` is a notice another flow redirects with.

export type LoginFixture = {
  email: string;
  error: string | null;
  message: string | null;
};

export type LoginSearchParams = { state?: string; long?: string };

// Supabase's own wording for a wrong email or password, which is what the
// real signIn action passes straight through to ?error=.
export const LOGIN_ERROR = "Invalid login credentials";

export const LOGIN_MESSAGE = "Your password has been updated. Sign in with the new one.";

// THE STRESS CASE, for scripts/check-comp-text-widths.mjs rather than for
// looks. A long address in the field and a long banner are what squeeze a
// narrow form column; the ordinary strings above never would. The wording is
// a stress string, not a message the app sends.
export const LONG_EMAIL = "operations.coordinator@northwood-facilities-management-group.example";
export const LONG_ERROR =
  "Email not confirmed. Open the confirmation link sent to operations.coordinator@northwood-facilities-management-group.example before you sign in.";

// Deliberately NOT "/demo". /demo is a route handler that signs the visitor
// in as the demo identity, so a live href here would swap the developer's own
// session out from under the comp they are looking at. The real page's link
// stays a plain <a href="/demo">; wiring it is Stage 2's job.
export const DEMO_HREF = "#view-demo";
export const FORGOT_HREF = "#forgot-password";

export const EMPTY_LOGIN: LoginFixture = { email: "", error: null, message: null };
