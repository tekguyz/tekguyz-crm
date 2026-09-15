// Where signIn may send a user after sign-in. PLAIN MODULE, not "use server":
// a "use server" file may only export async functions, and this is shared
// with its tests.
//
// `next` arrives from the query string, so anyone can craft it. Before
// 2026-09-15 signIn passed it straight to redirect(), so
// `/login?next=https://evil.example` sent a freshly signed-in user off-site.
//
// The check is done AFTER parsing, never by string prefix — the same rule as
// /api/dev-login. `//evil.example` and `/\evil.example` both start with "/"
// and both parse to a foreign host (WHATWG treats `\` as `/` and strips tabs
// and newlines), so a startsWith("/") test alone passes them. Anything that
// does not resolve to this origin falls back to "/".
const BASE = "http://this-origin.invalid";

export function safeNextPath(raw: FormDataEntryValue | null | undefined): string {
  if (typeof raw !== "string" || !raw.startsWith("/")) return "/";

  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return "/";
  }
  if (url.origin !== BASE) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}
